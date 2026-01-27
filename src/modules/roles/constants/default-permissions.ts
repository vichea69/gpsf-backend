import { Action } from '../enums/actions.enum';
import { Resource } from '../enums/resource.enum';
import { Role } from '@/modules/auth/enums/role.enum';

export interface SeedPermission {
    resource: Resource;
    actions: Action[];
}

export interface RoleSeed {
    slug: string;
    name: string;
    description: string;
    isSystem: boolean;
    permissions: SeedPermission[];
}

const fullCrud = [Action.Read, Action.Create, Action.Update, Action.Delete];

export const DEFAULT_ROLE_SEEDS: RoleSeed[] = [
    {
        slug: Role.Admin,
        name: 'Administrator',
        description: 'Full access to manage the application.',
        isSystem: true,
        permissions: [
            { resource: Resource.Logo, actions: fullCrud },
            { resource: Resource.SiteSettings, actions: fullCrud },
            { resource: Resource.Categories, actions: fullCrud },
            { resource: Resource.Pages, actions: fullCrud },
            { resource: Resource.Posts, actions: fullCrud },
            { resource: Resource.Testimonials, actions: fullCrud },
            { resource: Resource.Menu, actions: fullCrud },
            { resource: Resource.Users, actions: fullCrud },
            { resource: Resource.Roles, actions: fullCrud },
            { resource: Resource.Articles, actions: fullCrud },
        ],
    },
    {
        slug: Role.Editor,
        name: 'Editor',
        description: 'Manage all content resources with limited user access.',
        isSystem: true,
        permissions: [
            { resource: Resource.Logo, actions: fullCrud },
            { resource: Resource.SiteSettings, actions: fullCrud },
            { resource: Resource.Categories, actions: fullCrud },
            { resource: Resource.Pages, actions: fullCrud },
            { resource: Resource.Posts, actions: fullCrud },
            { resource: Resource.Testimonials, actions: fullCrud },
            { resource: Resource.Menu, actions: fullCrud },
            { resource: Resource.Articles, actions: fullCrud },
            { resource: Resource.Users, actions: [Action.Read] },
            { resource: Resource.Roles, actions: [Action.Read] },
        ],
    },
    {
        slug: Role.User,
        name: 'Viewer',
        description: 'Read-only access to published content.',
        isSystem: true,
        permissions: [
            { resource: Resource.Logo, actions: [Action.Read] },
            { resource: Resource.SiteSettings, actions: [Action.Read] },
            { resource: Resource.Categories, actions: [Action.Read] },
            { resource: Resource.Pages, actions: [Action.Read] },
            { resource: Resource.Posts, actions: [Action.Read] },
            { resource: Resource.Testimonials, actions: [Action.Read] },
            { resource: Resource.Menu, actions: [Action.Read] },
            { resource: Resource.Articles, actions: [Action.Read] },
        ],
    },
];
