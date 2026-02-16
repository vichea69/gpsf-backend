import { HttpException, HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
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

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    private readonly roleService: RoleService,
  ) {}

  async createUser(createUserDto: CreateUserDto): Promise<UserEntity> {
    await this.ensureUniqueCredentials(createUserDto.email, createUserDto.username);

    const newUser = this.userRepository.create(createUserDto);
    return await this.userRepository.save(newUser);
  }

  async adminCreateUser(dto: AdminCreateUserDto): Promise<UserEntity> {
    await this.ensureUniqueCredentials(dto.email, dto.username);
    await this.roleService.ensureRoleIsAssignable(dto.role);

    // role slug comes from checkbox UI, so validate before persisting
    const newUser = this.userRepository.create(dto);
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
    await this.mergeUpdates(user, updateUserDto);
    return await this.userRepository.save(user);
  }

  async adminUpdateUser(targetUserId: number, updateUserDto: UpdateUserDto): Promise<UserEntity> {
    const user = await this.findById(targetUserId);
    await this.mergeUpdates(user, updateUserDto);
    // after merging, save emits the new role/permissions pair to the DB
    return await this.userRepository.save(user);
  }

  async assignPermissionsToUser(userId: number, dto: UpdateRolePermissionsDto): Promise<IUserResponse> {
    const user = await this.findById(userId);

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
    await this.userRepository.remove(user);
  }

  async save(user: UserEntity): Promise<UserEntity> {
    return await this.userRepository.save(user);
  }

  async generateUserResponse(user: UserEntity): Promise<IUserResponse> {
    const permissions = user.role
      ? await this.roleService.getPermissionMapForRole(user.role)
      : {};

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
        token: this.generateAccessToken(user),
        refreshToken: this.generateRefreshToken(user),
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

  private async mergeUpdates(user: UserEntity, updateUserDto: UpdateUserDto): Promise<void> {
    const {
      password: maybeNewPassword,
      role: maybeRole,
      ...rest
    } = updateUserDto as Partial<UpdateUserDto> & { password?: string; role?: string };

    Object.assign(user, rest);

    if (typeof maybeRole === 'string' && maybeRole.trim().length > 0) {
      await this.roleService.ensureRoleIsAssignable(maybeRole);
      user.role = maybeRole;
      // assigning a new role updates the user checkbox matrix in one step
    }

    if (typeof maybeNewPassword === 'string' && maybeNewPassword.trim().length > 0) {
      user.password = await hash(maybeNewPassword, 10);
    }
  }

  private generateAccessToken(user: UserEntity): string {
    return sign(
      {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        type: 'access',
      },
      process.env.JWT_SECRET as string,
      { expiresIn: '15m' },
    );
  }

  private generateRefreshToken(user: UserEntity): string {
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
      { expiresIn: '7d' },
    );
  }
}
