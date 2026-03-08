import {
    BadRequestException,
    ConflictException,
    Injectable,
    Logger,
    NotFoundException,
    OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { RoleEntity } from './entity/role.entity';
import { RolePermissionEntity } from './entity/role-permission.entity';
import {
    CreateRoleDto,
    PermissionDto,
    UpdateRoleDto,
    UpdateRolePermissionsDto,
} from './dto/role.dto';
import { DEFAULT_ROLE_SEEDS } from './constants/default-permissions';
import {
    RESOURCE_DEFINITIONS,
    ResourceDefinition, 
    ResourceDefinitionAction,
} from './constants/resource-definitions';
import { PermissionMatrixRow, RolePermissionSummary, RoleSummary } from './types/permission-matrix.type';
import { PermissionRequirement } from './types/permission-requirement.type';
import { Resource } from './enums/resource.enum';
import { Action } from './enums/actions.enum';

@Injectable()
export class RoleService implements OnModuleInit {
    private readonly logger = new Logger(RoleService.name);
    private readonly resourceMap = new Map<Resource, ResourceDefinition>(
        RESOURCE_DEFINITIONS.map((definition) => [definition.resource, definition]),
    );
    
    private readonly validActions = new Set<Action>(Object.values(Action) as Action[]);

    constructor(
        @InjectRepository(RoleEntity)
        private readonly roleRepository: Repository<RoleEntity>,
        @InjectRepository(RolePermissionEntity)
        private readonly rolePermissionRepository: Repository<RolePermissionEntity>,
    ) {}

    async onModuleInit(): Promise<void> {
        await this.seedDefaultRoles();
    }

    async getResourceDefinitions(): Promise<ResourceDefinition[]> {
        return RESOURCE_DEFINITIONS;
    }

    async listRoles(): Promise<RoleSummary[]> {
        const roles = await this.roleRepository.find({
            order: { createdAt: 'ASC' },
            relations: ['permissions'],
        });

        return roles.map((role) => this.toRoleSummary(role));
    }

    async getRoleDetail(slug: string): Promise<RolePermissionSummary> {
        const role = await this.roleRepository.findOne({
            where: { slug },
            relations: ['permissions'],
        });

        if (!role) {
            throw new NotFoundException(`Role '${slug}' was not found.`);
        }

        return this.toRolePermissionSummary(role);
    }

    async getRoleDetailById(id: number): Promise<RolePermissionSummary> {
        const role = await this.roleRepository.findOne({
            where: { id },
            relations: ['permissions'],
        });

        if (!role) {
            throw new NotFoundException(`Role '${id}' was not found.`);
        }

        return this.toRolePermissionSummary(role);
    }

    private toRolePermissionSummary(role: RoleEntity): RolePermissionSummary {
        const matrix = this.buildPermissionMatrix(role.permissions ?? []);
        return {
            role: this.toRoleSummary(role),
            matrix,
            stats: this.calculateStats(matrix),
        };
    }

    async createRole(dto: CreateRoleDto): Promise<RolePermissionSummary> {
        let slug = dto.slug?.toLowerCase();
        if (slug) {
            const existing = await this.roleRepository.findOne({ where: { slug } });
            if (existing) {
                throw new ConflictException(`Role '${slug}' already exists.`);
            }
        } else {
            slug = await this.generateUniqueSlug(dto.name);
        }

        const role = this.roleRepository.create({
            slug,
            name: dto.name,
            description: dto.description,
            isActive: dto.isActive ?? true,
            isSystem: false,
        });
        const saved = await this.roleRepository.save(role);

        if (dto.permissions && dto.permissions.length > 0) {
            await this.assignPermissions(saved.id, dto.permissions);
        }

        return this.getRoleDetail(saved.slug);
    }

    async updateRole(id: number, dto: UpdateRoleDto): Promise<RolePermissionSummary> {
        const role = await this.roleRepository.findOne({ where: { id } });
        if (!role) {
            throw new NotFoundException(`Role '${id}' was not found.`);
        }

        const incomingSlug = dto.slug?.toLowerCase();

        if (role.isSystem && incomingSlug && incomingSlug !== role.slug) {
            throw new BadRequestException('System roles cannot change slug.');
        }

        if (incomingSlug && incomingSlug !== role.slug) {
            const slugTaken = await this.roleRepository.exist({ where: { slug: incomingSlug } });
            if (slugTaken) {
                throw new ConflictException(`Role '${incomingSlug}' already exists.`);
            }
            role.slug = incomingSlug;
        }

        if (typeof dto.name === 'string') {
            role.name = dto.name;
        }

        if (typeof dto.description !== 'undefined') {
            role.description = dto.description ?? null;
        }

        if (typeof dto.isActive === 'boolean') {
            role.isActive = dto.isActive;
        }

        const saved = await this.roleRepository.save(role);

        if (dto.permissions) {
            await this.replacePermissions(saved.id, dto.permissions);
        }

        return this.getRoleDetail(saved.slug);
    }

    async deleteRole(id: number): Promise<void> {
        const role = await this.roleRepository.findOne({ where: { id } });
        if (!role) {
            throw new NotFoundException(`Role '${id}' was not found.`);
        }

        if (role.isSystem) {
            throw new BadRequestException('System roles cannot be deleted.');
        }

        await this.roleRepository.remove(role);
    }

    async updatePermissions(id: number, dto: UpdateRolePermissionsDto): Promise<RolePermissionSummary> {
        const role = await this.roleRepository.findOne({ where: { id } });
        if (!role) {
            throw new NotFoundException(`Role '${id}' was not found.`);
        }

        await this.replacePermissions(role.id, dto.permissions);
        return this.getRoleDetail(role.slug);
    }

    async ensureRoleIsAssignable(slug: string): Promise<RoleEntity> {
        const role = await this.roleRepository.findOne({ where: { slug, isActive: true } });
        if (!role) {
            throw new BadRequestException(`Role '${slug}' does not exist or is inactive.`);
        }
        return role;
    }

    async roleHasPermissions(roleSlug: string | undefined, requirements: PermissionRequirement[]): Promise<boolean> {
        if (!roleSlug || requirements.length === 0) {
            return false;
        }

        const role = await this.roleRepository.findOne({
            where: { slug: roleSlug, isActive: true },
            relations: ['permissions'],
        });

        if (!role) {
            return false;
        }

        const permissionMap = new Map<Resource, Set<Action>>();
        for (const permission of role.permissions ?? []) {
            permissionMap.set(permission.resource, new Set(permission.actions ?? []));
        }

        return requirements.every((requirement) => {
            const allowed = permissionMap.get(requirement.resource);
            if (!allowed) {
                return false;
            }

            return requirement.actions.every((action) => allowed.has(action));
        });
    }

    async getPermissionMapForRole(roleSlug: string): Promise<Record<Resource, Action[]>> {
        const role = await this.roleRepository.findOne({
            where: { slug: roleSlug },
            relations: ['permissions'],
        });

        if (!role) {
            return {} as Record<Resource, Action[]>;
        }

        return (role.permissions ?? []).reduce<Record<Resource, Action[]>>((acc, permission) => {
            acc[permission.resource] = [...(permission.actions ?? [])];
            return acc;
        }, {} as Record<Resource, Action[]>);
    }

    private async seedDefaultRoles(): Promise<void> {
        for (const seed of DEFAULT_ROLE_SEEDS) {
            let role = await this.roleRepository.findOne({
                where: { slug: seed.slug },
            });

            if (!role) {
                role = this.roleRepository.create({
                    slug: seed.slug,
                    name: seed.name,
                    description: seed.description,
                    isSystem: seed.isSystem,
                    isActive: true,
                });
                this.logger.log(`Created default role '${seed.slug}'.`);
            } else {
                if (!role.name) {
                    role.name = seed.name;
                }
                if (!role.description && seed.description) {
                    role.description = seed.description;
                }
                if (!role.isActive) {
                    role.isActive = true;
                }
                if (seed.isSystem && !role.isSystem) {
                    role.isSystem = true;
                    this.logger.log(`Marked role '${role.slug}' as system role.`);
                }
            }

            const savedRole = await this.roleRepository.save(role);
            await this.ensureSeedPermissions(savedRole.id, seed.permissions);
        }
    }

    private async ensureSeedPermissions(roleId: number, permissions: PermissionDto[]): Promise<void> {
        if (permissions.length === 0) {
            return;
        }

        this.validatePermissions(permissions);

        const existing = await this.rolePermissionRepository.find({
            where: { roleId, resource: In(permissions.map((permission) => permission.resource)) },
        });

        const existingMap = new Map<Resource, RolePermissionEntity>(
            existing.map((permission) => [permission.resource, permission]),
        );

        for (const permission of permissions) {
            const current = existingMap.get(permission.resource);
            if (!current) {
                const created = this.rolePermissionRepository.create({
                    roleId,
                    resource: permission.resource,
                    actions: this.sanitizeActions(permission.actions),
                });
                await this.rolePermissionRepository.save(created);
            }
        }
    }

    private async assignPermissions(roleId: number, permissions: PermissionDto[]): Promise<void> {
        this.validatePermissions(permissions);

        const payload = permissions.map((permission) => ({
            roleId,
            resource: permission.resource,
            actions: this.sanitizeActions(permission.actions),
        }));

        const entities = this.rolePermissionRepository.create(payload);
        await this.rolePermissionRepository.save(entities);
    }

    private async replacePermissions(roleId: number, permissions: PermissionDto[]): Promise<void> {
        await this.rolePermissionRepository.delete({ roleId });
        if (permissions.length === 0) {
            return;
        }
        await this.assignPermissions(roleId, permissions);
    }

    private buildPermissionMatrix(permissions: RolePermissionEntity[]): PermissionMatrixRow[] {
        const permissionMap = new Map<Resource, Set<Action>>();
        for (const permission of permissions) {
            permissionMap.set(permission.resource, new Set(permission.actions ?? []));
        }

        return RESOURCE_DEFINITIONS.map((definition) => this.toMatrixRow(definition, permissionMap));
    }

    private toMatrixRow(
        definition: ResourceDefinition,
        permissionMap: Map<Resource, Set<Action>>,
    ): PermissionMatrixRow {
        const granted = permissionMap.get(definition.resource) ?? new Set<Action>();
        return {
            resource: definition.resource,
            label: definition.label,
            description: definition.description,
            toggles: definition.actions.map((action: ResourceDefinitionAction) => ({
                action: action.action,
                label: action.label,
                enabled: granted.has(action.action),
            })),
        };
    }

    private calculateStats(matrix: PermissionMatrixRow[]): { selected: number; total: number } {
        let selected = 0;
        let total = 0;
        for (const row of matrix) {
            for (const toggle of row.toggles) {
                total += 1;
                if (toggle.enabled) {
                    selected += 1;
                }
            }
        }
        return { selected, total };
    }

    private toRoleSummary(role: RoleEntity): RoleSummary {
        const permissions = role.permissions ?? [];
        const permissionsCount = permissions.reduce((count, permission) => count + (permission.actions?.length ?? 0), 0);
        return {
            id: role.id,
            slug: role.slug,
            name: role.name,
            description: role.description,
            isSystem: role.isSystem,
            isActive: role.isActive,
            permissionsCount,
            resourcesCount: permissions.length,
            createdAt: role.createdAt,
            updatedAt: role.updatedAt,
        };
    }

    private async generateUniqueSlug(name: string): Promise<string> {
        const base = this.slugify(name);
        if (base.length < 2) {
            throw new BadRequestException(
                'Unable to generate a valid slug. Provide a slug or use a name with at least two alphanumeric characters.',
            );
        }

        let candidate = base;
        let counter = 1;
        while (await this.roleRepository.exist({ where: { slug: candidate } })) {
            const suffix = `-${counter}`;
            const truncatedBase = base.slice(0, Math.max(1, 64 - suffix.length));
            candidate = `${truncatedBase}${suffix}`;
            counter += 1;
        }

        return candidate;
    }

    private slugify(value: string): string {
        const normalized = value
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');

        return normalized.slice(0, 64);
    }

    private sanitizeActions(actions: Action[]): Action[] {
        const unique = new Set<Action>();
        for (const action of actions) {
            if (this.validActions.has(action)) {
                unique.add(action);
            }
        }
        return Array.from(unique);
    }

    private validatePermissions(permissions: PermissionDto[]): void {
        for (const permission of permissions) {
            const definition = this.resourceMap.get(permission.resource);
            if (!definition) {
                throw new BadRequestException(`Unknown resource '${permission.resource}'.`);
            }

            const allowedActions = new Set<Action>(definition.actions.map((item) => item.action));
            for (const action of permission.actions) {
                if (!this.validActions.has(action)) {
                    throw new BadRequestException(`Unsupported action '${action}'.`);
                }
                if (!allowedActions.has(action)) {
                    throw new BadRequestException(
                        `Action '${action}' is not available for resource '${permission.resource}'.`,
                    );
                }
            }
        }
    }

}
