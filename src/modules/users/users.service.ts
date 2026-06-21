import { BadRequestException, HttpException, HttpStatus, Injectable, NotFoundException, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { hash } from 'bcrypt';
import { UserEntity } from './entities/user.entity';
import { CreateUserDto } from '../auth/dto/create-user.dto';
import { AdminCreateUserDto } from './dto/admin-create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { IUserResponse } from './types/userResponse.interface';
import { sign } from 'jsonwebtoken';
import { RoleService } from '../roles/role.service';
import { UserType } from './types/user.type';
import { Action } from '../roles/enums/actions.enum';
import { Resource } from '../roles/enums/resource.enum';
import { UpdateRolePermissionsDto } from '../roles/dto/role.dto';
import { CreateRoleDto } from '../roles/dto/role.dto';
import { Role } from '@/modules/auth/enums/role.enum';
import { SYSTEM_SUPER_ADMIN } from './constants/system-users';
import { durationToSeconds } from '@/common/utils/durationToSeconds';

@Injectable()
export class UsersService implements OnApplicationBootstrap {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    private readonly roleService: RoleService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.ensureSystemSuperAdmin();
  }

  async createUser(createUserDto: CreateUserDto): Promise<UserEntity> {
    await this.ensureUniqueCredentials(createUserDto.email, createUserDto.username);

    // Public register always creates a normal user role.
    const newUser = this.userRepository.create({
      username: createUserDto.username,
      email: createUserDto.email,
      password: createUserDto.password,
      role: Role.User,
    });
    return await this.userRepository.save(newUser);
  }

  async adminCreateUser(dto: AdminCreateUserDto): Promise<UserEntity> {
    await this.ensureUniqueCredentials(dto.email, dto.username);

    if (dto.role === Role.SuperAdmin) {
      throw new BadRequestException('Super admin account is seeded by the system and cannot be created manually.');
    }

    await this.roleService.ensureRoleIsAssignable(dto.role);

    // role slug comes from checkbox UI, so validate before persisting
    const newUser = this.userRepository.create({
      username: dto.username,
      email: dto.email,
      password: dto.password,
      role: dto.role,
    });
    return await this.userRepository.save(newUser);
  }

  async findById(id: number): Promise<UserEntity> {
    const user = await this.userRepository.findOne({ where: { id } });

    if (!user) {
      throw new HttpException('User not found', HttpStatus.UNPROCESSABLE_ENTITY);
    }

    return user;
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    return await this.userRepository.findOne({ where: { email } });
  }

  async findAll(): Promise<UserEntity[]> {
    return await this.userRepository.find();
  }

  async getAdminUserProfile(id: number): Promise<UserType & { permissions: Partial<Record<Resource, Action[]>> }> {
    const user = await this.findById(id);
    const { password, resetPasswordToken, resetPasswordTokenExpiresAt, ...safeUser } = user as UserEntity & {
      password?: string;
      resetPasswordToken?: string | null;
      resetPasswordTokenExpiresAt?: Date | null;
    };

    const permissions = user.role ? await this.roleService.getPermissionMapForRole(user.role) : {};

    // return shape mirrors checkbox editor: plain user fields plus current permission map
    return {
      ...(safeUser as UserType),
      permissions,
    };
  }

  async updateUser(userId: number, updateUserDto: UpdateUserDto): Promise<UserEntity> {
    const user = await this.findById(userId);
    await this.mergeUpdates(user, updateUserDto, false);
    return await this.userRepository.save(user);
  }

  async adminUpdateUser(
    targetUserId: number,
    updateUserDto: UpdateUserDto,
  ): Promise<UserEntity> {
    const user = await this.findById(targetUserId);
    if (this.isProtectedSuperAdmin(user)) {
      throw new BadRequestException('Protected super admin account cannot be edited.');
    }
    await this.mergeUpdates(user, updateUserDto, true);
    // after merging, save emits the new role/permissions pair to the DB
    return await this.userRepository.save(user);
  }

  async assignPermissionsToUser(userId: number, dto: UpdateRolePermissionsDto): Promise<IUserResponse> {
    const user = await this.findById(userId);

    if (this.isProtectedSuperAdmin(user)) {
      throw new BadRequestException('Protected super admin permissions cannot be changed.');
    }

    const customRoleSlug = user.role && user.role.startsWith('user-custom-')
      ? user.role
      : `user-custom-${user.id}`;

    try {
      const roleDetail = await this.roleService.getRoleDetail(customRoleSlug);
      await this.roleService.updatePermissions(roleDetail.role.id, dto);
    } catch (error) {
      if (!(error instanceof NotFoundException)) {
        throw error;
      }
      const payload: CreateRoleDto = {
        slug: customRoleSlug,
        name: `User ${user.id} custom role`,
        description: `Permissions tailored for user ${user.id}`,
        isActive: true,
        permissions: dto.permissions,
      };
      await this.roleService.createRole(payload);
    }

    if (user.role !== customRoleSlug) {
      user.role = customRoleSlug;
      await this.userRepository.save(user);
    }

    return await this.generateUserResponse(user);
  }

  async adminDeleteUser(targetUserId: number): Promise<void> {
    const user = await this.findById(targetUserId);
    if (this.isProtectedSuperAdmin(user)) {
      throw new BadRequestException('Protected super admin account cannot be deleted.');
    }
    await this.userRepository.remove(user);
  }

  async save(user: UserEntity): Promise<UserEntity> {
    return await this.userRepository.save(user);
  }

  async generateUserResponse(
    user: UserEntity,
    options?: { rememberMe?: boolean },
  ): Promise<IUserResponse> {
    const permissions = user.role
      ? await this.roleService.getPermissionMapForRole(user.role)
      : {};

    // Token TTLs come from env so ops can tune without a code change.
    // Defaults: 8h regular session, 7d when remember-me is on (same as refresh
    // token so both cookies expire together in that mode).
    const rememberMe = options?.rememberMe === true;
    const accessTtl = rememberMe
      ? process.env.JWT_ACCESS_REMEMBER_ME_EXPIRES_IN || '7d'
      : process.env.JWT_ACCESS_EXPIRES_IN || '8h';
    const refreshTtl = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

    // embed current role + permissions so frontend can pre-fill checkboxes
    return {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        bio: user.bio,
        image: user.image,
        role: user.role,
        lastLogin: user.lastLogin,
        permissions,
        token: this.generateAccessToken(user, accessTtl),
        refreshToken: this.generateRefreshToken(user, refreshTtl),
      },
      meta: {
        accessTokenExpiresIn: durationToSeconds(accessTtl, 60 * 60 * 8),
        refreshTokenExpiresIn: durationToSeconds(refreshTtl, 60 * 60 * 24 * 7),
        rememberMe,
      },
    };
  }

  async ensureUniqueCredentials(email: string, username: string): Promise<void> {
    const [userByEmail, userByUsername] = await Promise.all([
      this.userRepository.findOne({ where: { email } }),
      this.userRepository.findOne({ where: { username } }),
    ]);

    if (userByEmail || userByUsername) {
      throw new HttpException('Email or username are already in use', HttpStatus.UNPROCESSABLE_ENTITY);
    }
  }

  private async mergeUpdates(
    user: UserEntity,
    updateUserDto: UpdateUserDto,
    allowRoleChange: boolean,
  ): Promise<void> {
    const {
      password: maybeNewPassword,
      role: maybeRole,
      ...rest
    } = updateUserDto as Partial<UpdateUserDto> & { password?: string; role?: string };

    this.assertProtectedSuperAdminUpdate(user, maybeRole);

    Object.assign(user, rest);

    if (typeof maybeRole === 'string' && maybeRole.trim().length > 0) {
      if (!allowRoleChange) {
        throw new BadRequestException('Role cannot be changed from this endpoint.');
      }

      const nextRole = maybeRole.trim();
      if (nextRole !== user.role) {
        await this.roleService.ensureRoleIsAssignable(nextRole);
        user.role = nextRole;
      }
      // assigning a new role updates the user checkbox matrix in one step
    }

    if (typeof maybeNewPassword === 'string' && maybeNewPassword.trim().length > 0) {
      user.password = await hash(maybeNewPassword, 10);
    }
  }

  private generateAccessToken(user: UserEntity, expiresIn: string = '8h'): string {
    return sign(
      {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        type: 'access',
      },
      process.env.JWT_SECRET as string,
      { expiresIn } as any,
    );
  }

  private generateRefreshToken(user: UserEntity, expiresIn: string = '7d'): string {
    const secret = (process.env.JWT_REFRESH_SECRET as string) || (process.env.JWT_SECRET as string);

    return sign(
      {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        type: 'refresh',
      },
      secret,
      { expiresIn } as any,
    );
  }

  private async ensureSystemSuperAdmin(): Promise<void> {
    // Keep exactly one reserved super-admin account after rolling back the multi-owner experiment.
    const existingSuperAdmins = await this.userRepository.find({
      where: { role: Role.SuperAdmin },
      order: { id: 'ASC' },
    });

    if (existingSuperAdmins.length > 1) {
      const [, ...extraSuperAdmins] = existingSuperAdmins;
      for (const extraUser of extraSuperAdmins) {
        extraUser.role = Role.Admin;
      }
      await this.userRepository.save(extraSuperAdmins);
      return;
    }

    if (existingSuperAdmins.length === 1) {
      return;
    }

    const existing = await this.userRepository.findOne({
      where: { email: SYSTEM_SUPER_ADMIN.email },
    });

    if (!existing) {
      // Seed one protected owner account for first-time system access.
      const user = this.userRepository.create({
        username: SYSTEM_SUPER_ADMIN.username,
        email: SYSTEM_SUPER_ADMIN.email,
        password: SYSTEM_SUPER_ADMIN.password,
        role: SYSTEM_SUPER_ADMIN.role,
      });
      await this.userRepository.save(user);
      return;
    }

    let shouldSave = false;

    if (existing.role !== Role.SuperAdmin) {
      existing.role = Role.SuperAdmin;
      shouldSave = true;
    }

    if (!existing.username) {
      existing.username = SYSTEM_SUPER_ADMIN.username;
      shouldSave = true;
    }

    if (shouldSave) {
      await this.userRepository.save(existing);
    }
  }

  private isProtectedSuperAdmin(user: Pick<UserEntity, 'role'> | null | undefined): boolean {
    return user?.role === Role.SuperAdmin;
  }

  private assertProtectedSuperAdminUpdate(
    user: UserEntity,
    nextRole?: string,
  ): void {
    if (!this.isProtectedSuperAdmin(user)) {
      return;
    }

    if (typeof nextRole === 'string' && nextRole.trim().toLowerCase() !== Role.SuperAdmin) {
      throw new BadRequestException('Protected super admin role cannot be changed.');
    }
  }
}
