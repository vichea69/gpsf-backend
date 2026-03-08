import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Patch,
    Post,
    Put,
    UseGuards,
    UsePipes,
    ValidationPipe,
    ParseIntPipe,
} from '@nestjs/common';
import { RoleService } from './role.service';
import { AuthGuard } from '@/modules/auth/guards/auth.guard';
import { PermissionsGuard } from './guards/permissions.guard';
import { Permissions } from './decorator/permissions.decorator';
import { Resource } from './enums/resource.enum';
import { Action } from './enums/actions.enum';
import { CreateRoleDto, UpdateRoleDto, UpdateRolePermissionsDto } from './dto/role.dto';
import { User } from '@/modules/auth/decorators/user.decorator';

@Controller('roles')
export class RoleController {
    constructor(private readonly roleService: RoleService) {}

    @Get()
    @UseGuards(AuthGuard, PermissionsGuard)
    @Permissions({ resource: Resource.Roles, actions: [Action.Read] })
    async listRoles() {
        return this.roleService.listRoles();
    }

    @Get('resources/definition')
    @UseGuards(AuthGuard, PermissionsGuard)
    @Permissions({ resource: Resource.Roles, actions: [Action.Read] })
    async getResourceDefinitions() {
        return this.roleService.getResourceDefinitions();
    }

    @Get('me/permissions')
    @UseGuards(AuthGuard)
    async getMyPermissions(@User('role') role: string | undefined) {
        if (!role) {
            return {};
        }
        return this.roleService.getPermissionMapForRole(role);
    }

    @Get(':id')
    @UseGuards(AuthGuard, PermissionsGuard)
    @Permissions({ resource: Resource.Roles, actions: [Action.Read] })
    async getRoleById(@Param('id', ParseIntPipe) id: number) {
        return this.roleService.getRoleDetailById(id);
    }

    @Post()
    @UseGuards(AuthGuard, PermissionsGuard)
    @Permissions({ resource: Resource.Roles, actions: [Action.Create] })
    @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
    async createRole(@Body() dto: CreateRoleDto) {
        return this.roleService.createRole(dto);
    }

    @Patch(':id')
    @UseGuards(AuthGuard, PermissionsGuard)
    @Permissions({ resource: Resource.Roles, actions: [Action.Update] })
    @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
    async updateRole(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateRoleDto) {
        return this.roleService.updateRole(id, dto);
    }

    @Put(':id/permissions')
    @UseGuards(AuthGuard, PermissionsGuard)
    @Permissions({ resource: Resource.Roles, actions: [Action.Update] })
    @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
    async updatePermissions(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateRolePermissionsDto) {
        return this.roleService.updatePermissions(id, dto);
    }

    @Delete(':id')
    @UseGuards(AuthGuard, PermissionsGuard)
    @Permissions({ resource: Resource.Roles, actions: [Action.Delete] })
    async deleteRole(@Param('id', ParseIntPipe) id: number) {
        await this.roleService.deleteRole(id);
        return { message: `Role '${id}' deleted.` };
    }
}
