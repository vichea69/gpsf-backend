import { Action } from '../enums/actions.enum';
import { Resource } from '../enums/resource.enum';

export interface ResourceDefinitionAction {
    action: Action;
    label: string;
}

export interface ResourceDefinition {
    resource: Resource;
    label: string;
    description: string;
    actions: ResourceDefinitionAction[];
}

export const RESOURCE_DEFINITIONS: ResourceDefinition[] = [
    {
        resource: Resource.Logo,
        label: 'Logo',
        description: 'Create and manage the site logo.',
        actions: [
            { action: Action.Read, label: 'View' },
            { action: Action.Create, label: 'Create' },
            { action: Action.Update, label: 'Update' },
            { action: Action.Delete, label: 'Delete' },
        ],
    },
    {
        resource: Resource.SiteSettings,
        label: 'Site Settings',
        description: 'Manage global site configuration and branding.',
        actions: [
            { action: Action.Read, label: 'View' },
            { action: Action.Create, label: 'Create' },
            { action: Action.Update, label: 'Update' },
            { action: Action.Delete, label: 'Delete' },
        ],
    },
    {
        resource: Resource.Categories,
        label: 'Categories',
        description: 'Create and publish categories.',
        actions: [
            { action: Action.Read, label: 'View' },
            { action: Action.Create, label: 'Create' },
            { action: Action.Update, label: 'Update' },
            { action: Action.Delete, label: 'Delete' },
        ],
    },
    {
        resource: Resource.Pages,
        label: 'Pages',
        description: 'Create and publish pages.',
        actions: [
            { action: Action.Read, label: 'View' },
            { action: Action.Create, label: 'Create' },
            { action: Action.Update, label: 'Update' },
            { action: Action.Delete, label: 'Delete' },
        ],
    },
    {
        resource: Resource.Posts,
        label: 'Posts',
        description: 'Create and publish posts.',
        actions: [
            { action: Action.Read, label: 'View' },
            { action: Action.Create, label: 'Create' },
            { action: Action.Update, label: 'Update' },
            { action: Action.Delete, label: 'Delete' },
        ],
    },
    {
        resource: Resource.Testimonials,
        label: 'Testimonials',
        description: 'Create and manage testimonials.',
        actions: [
            { action: Action.Read, label: 'View' },
            { action: Action.Create, label: 'Create' },
            { action: Action.Update, label: 'Update' },
            { action: Action.Delete, label: 'Delete' },
        ],
    },
    {
        resource: Resource.Menu,
        label: 'Menu',
        description: 'Organize the site navigation menu.',
        actions: [
            { action: Action.Read, label: 'View' },
            { action: Action.Create, label: 'Create' },
            { action: Action.Update, label: 'Update' },
            { action: Action.Delete, label: 'Delete' },
        ],
    },
    {
        resource: Resource.Users,
        label: 'Users',
        description: 'Manage application users and profiles.',
        actions: [
            { action: Action.Read, label: 'View' },
            { action: Action.Create, label: 'Create' },
            { action: Action.Update, label: 'Update' },
            { action: Action.Delete, label: 'Delete' },
        ],
    },
    {
        resource: Resource.Roles,
        label: 'Roles',
        description: 'Manage roles and their permissions.',
        actions: [
            { action: Action.Read, label: 'View' },
            { action: Action.Create, label: 'Create' },
            { action: Action.Update, label: 'Update' },
            { action: Action.Delete, label: 'Delete' },
        ],
    },
    {
        resource: Resource.Articles,
        label: 'Articles',
        description: 'Create and manage articles.',
        actions: [
            { action: Action.Read, label: 'View' },
            { action: Action.Create, label: 'Create' },
            { action: Action.Update, label: 'Update' },
            { action: Action.Delete, label: 'Delete' },
        ],
    },
];
