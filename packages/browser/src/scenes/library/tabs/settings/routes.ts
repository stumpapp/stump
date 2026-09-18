import { UserPermission } from '@stump/graphql'
import {
	BookOpenText,
	FlaskRound,
	Image,
	NotebookTabs,
	PackageX,
	ScanSearch,
	ShieldCheck,
} from 'lucide-react'

import { RouteGroup } from '@/hooks/useRouteGroups'

export const createRouteGroups = (libraryId: string, basePath = ''): RouteGroup[] => [
	{
		defaultRoute: `${basePath}/libraries/${libraryId}/settings/basics`,
		items: [
			{
				icon: NotebookTabs,
				label: 'Basics',
				localeKey: 'basics',
				permissions: [UserPermission.EditLibrary],
				to: `${basePath}/libraries/${libraryId}/settings/basics`,
			},
		],
	},
	{
		defaultRoute: `${basePath}/libraries/${libraryId}/settings/scanning`,
		items: [
			{
				icon: BookOpenText,
				label: 'Reading',
				localeKey: 'options/reading',
				permissions: [UserPermission.EditLibrary],
				to: `${basePath}/libraries/${libraryId}/settings/reading`,
			},
			{
				icon: ScanSearch,
				label: 'Scanning',
				localeKey: 'options/scanning',
				permissions: [UserPermission.ManageLibrary],
				to: `${basePath}/libraries/${libraryId}/settings/scanning`,
			},
			{
				icon: Image,
				label: 'Thumbnails',
				localeKey: 'options/thumbnails',
				permissions: [UserPermission.ManageLibrary],
				to: `${basePath}/libraries/${libraryId}/settings/thumbnails`,
			},
		],
		label: 'Configuration',
	},
	{
		defaultRoute: `${basePath}/libraries/${libraryId}/settings/metadata`,
		items: [
			{
				icon: FlaskRound,
				label: 'Analysis',
				localeKey: 'integrations/analysis',
				permissions: [UserPermission.ManageLibrary],
				to: `${basePath}/libraries/${libraryId}/settings/analysis`,
			},
			{
				icon: BookOpenText,
				label: 'Metadata',
				localeKey: 'integrations/metadata',
				permissions: [UserPermission.MetadataFetchRecordManage],
				to: `${basePath}/libraries/${libraryId}/settings/metadata`,
			},
		],
		label: 'Integrations',
	},
	{
		defaultRoute: `${basePath}/libraries/${libraryId}/settings/danger`,
		items: [
			{
				icon: ShieldCheck,
				label: 'Access Control',
				localeKey: 'danger-zone/access-control',
				permissions: [UserPermission.ManageLibrary, UserPermission.ReadUsers],
				to: `${basePath}/libraries/${libraryId}/settings/access-control`,
			},
			{
				icon: PackageX,
				label: 'Delete',
				localeKey: 'danger-zone/delete',
				permissions: [UserPermission.DeleteLibrary],
				to: `${basePath}/libraries/${libraryId}/settings/delete`,
			},
		],
		label: 'Danger Zone',
	},
]
