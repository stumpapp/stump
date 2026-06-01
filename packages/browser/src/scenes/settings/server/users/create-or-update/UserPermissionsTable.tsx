import { CheckBox, Heading, Link, Text } from '@stump/components'
import { UserPermission } from '@stump/graphql'
import { useLocaleContext } from '@stump/i18n'
import { createColumnHelper, getCoreRowModel, useReactTable } from '@tanstack/react-table'
import { useCallback, useEffect, useMemo } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'

import paths from '@/paths'

import { CreateOrUpdateUserSchema } from './schema'

export default function UserPermissionsTable() {
	const { t } = useLocaleContext()

	const form = useFormContext<CreateOrUpdateUserSchema>()

	const selectedPermissions = useWatch({ control: form.control, name: 'permissions' })

	useEffect(() => {
		const selectionsWithAssociations = (selectedPermissions || []).reduce<UserPermission[]>(
			(acc, permission) => {
				const associated = associatedPermissions[permission] || []
				return [...acc, permission, ...associated]
			},
			[],
		)
		const uniqueSelections = [...new Set(selectionsWithAssociations)]
		if (uniqueSelections.length !== selectedPermissions?.length) {
			form.setValue('permissions', uniqueSelections)
		}
	}, [form, selectedPermissions])

	const handlePermissionClick = useCallback(
		(permission: UserPermission) => {
			if (selectedPermissions.includes(permission)) {
				form.setValue(
					'permissions',
					selectedPermissions.filter((p) => p !== permission),
				)
			} else {
				form.setValue('permissions', [...selectedPermissions, permission])
			}
		},
		[form, selectedPermissions],
	)

	const handleGroupClick = useCallback(
		(groupId: string) => {
			const groupPermissions = groups.find((group) => group.groupKey === groupId)?.permissions ?? []
			const allSelected = groupPermissions.every((p) => selectedPermissions.includes(p))
			const newSelected = allSelected
				? selectedPermissions.filter((p) => !groupPermissions.includes(p))
				: [...selectedPermissions, ...groupPermissions]
			form.setValue('permissions', newSelected)
		},
		[form, selectedPermissions],
	)

	const tableData: TableRow[] = useMemo(
		() =>
			groups.flatMap((group) => [
				{
					type: 'group',
					groupKey: group.groupKey || '',
					id: group.groupKey || '',
					permissions: group.permissions,
				},
				...group.permissions.map((permission) => ({
					type: 'permission' as const,
					permission,
					groupId: group.groupKey || '',
					label: t(getPermissionKey(permission, 'label')),
					description: t(getPermissionKey(permission, 'description')),
				})),
			]),
		[t],
	)

	const renderDescription = () => {
		const description = t(getLocaleKey('subtitle.0'))
		const documentation = t(getLocaleKey('subtitle.1'))

		return (
			<>
				{description}{' '}
				<Link
					href={paths.docs('access-control', 'user-permissions')}
					target="_blank"
					rel="noopener noreferrer"
				>
					{documentation}
				</Link>
			</>
		)
	}

	const table = useReactTable({
		data: tableData,
		columns,
		getCoreRowModel: getCoreRowModel(),
		enableRowSelection: false,
	})

	return (
		<div className="gap-4 flex flex-col">
			<div>
				<Heading size="sm">{t(getLocaleKey('heading'))}</Heading>
				<Text size="sm" variant="muted" className="mt-1">
					{renderDescription()}
				</Text>
			</div>
			<div className="h-96 overflow-auto rounded-lg border border-border">
				<table className="w-full">
					<tbody>
						{table.getRowModel().rows.map((row) => {
							const isGroup = row.original.type === 'group'
							const isPermission = row.original.type === 'permission'

							if (isGroup) {
								const groupData = row.original as Extract<TableRow, { type: 'group' }>
								const groupName = t(getLocaleKey(`groups.${groupData.groupKey}`))

								return (
									<tr
										key={row.id}
										className="top-0 backdrop-blur-sm sticky z-10 border-b border-border bg-background"
									>
										<td className="px-4 py-3 font-semibold bg-muted/50 text-foreground">
											{groupName}
										</td>
										<td className="px-4 py-3 bg-muted/50">
											<CheckBox
												id={groupData.id}
												name={groupData.id}
												checked={groupData.permissions.every(
													(p) => selectedPermissions?.includes(p) ?? false,
												)}
												onClick={() => handleGroupClick(groupData.groupKey)}
											/>
										</td>
									</tr>
								)
							}

							if (isPermission) {
								const permissionData = row.original as Extract<TableRow, { type: 'permission' }>

								return (
									<tr
										key={row.id}
										className="border-b border-border transition-colors hover:bg-muted/50"
									>
										<td className="px-4 py-3 pl-8 text-sm">
											<Text>{permissionData.label}</Text>
											<Text variant="muted" size="sm">
												{permissionData.description}
											</Text>
										</td>
										<td className="px-4 py-3">
											<CheckBox
												id={permissionData.permission}
												name={permissionData.permission}
												checked={selectedPermissions?.includes(permissionData.permission) ?? false}
												onClick={() => handlePermissionClick(permissionData.permission)}
											/>
										</td>
									</tr>
								)
							}

							return null
						})}
					</tbody>
				</table>
			</div>
		</div>
	)
}

type TableRow =
	| { type: 'group'; groupKey: string; id: string; permissions: UserPermission[] }
	| {
			type: 'permission'
			permission: UserPermission
			groupId: string
			label: string
			description: string
	  }

const LOCAL_BASE = 'settingsScene.server/users.createOrUpdateForm.permissions'
const getLocaleKey = (path: string) => `${LOCAL_BASE}.${path}`

const getPermissionKey = (permission: UserPermission, key: string) =>
	`userPermissions.${permission}.${key}`

const groups = [
	{
		groupKey: 'accountManagement',
		permissions: [
			UserPermission.ChangePassword,
			UserPermission.ChangeUsername,
			UserPermission.ChangeAvatar,
		],
	},
	{
		groupKey: 'featureAccess',
		permissions: [
			UserPermission.AccessApiKeys,
			UserPermission.AccessBookClub,
			UserPermission.AccessKoreaderSync,
			UserPermission.AccessKoboSync,
			UserPermission.AccessSmartList,
		],
	},
	{
		groupKey: 'fileManagement',
		permissions: [
			UserPermission.DownloadFile,
			UserPermission.FileExplorer,
			UserPermission.UploadFile,
		],
	},
	{
		groupKey: 'emailers',
		permissions: [
			UserPermission.EmailerRead,
			UserPermission.EmailerCreate,
			UserPermission.EmailerManage,
		],
	},
	{
		groupKey: 'emailing',
		permissions: [UserPermission.EmailSend, UserPermission.EmailArbitrarySend],
	},
	{
		groupKey: 'libraryManagement',
		permissions: [
			UserPermission.CreateLibrary,
			UserPermission.EditLibrary,
			UserPermission.ScanLibrary,
			UserPermission.ManageLibrary,
			UserPermission.DeleteLibrary,
			UserPermission.EditMetadata,
			UserPermission.WriteBackMetadata,
			UserPermission.EditThumbnails,
		],
	},
	{
		groupKey: 'userManagement',
		permissions: [UserPermission.ReadUsers, UserPermission.ManageUsers],
	},
	{
		groupKey: 'serverManagement',
		permissions: [
			UserPermission.ReadJobs,
			UserPermission.ManageJobs,
			UserPermission.ReadPersistedLogs,
			UserPermission.ReadSystemLogs,
			UserPermission.ManageServer,
		],
	},
]

const columnHelper = createColumnHelper<TableRow>()

const columns = [
	columnHelper.accessor('type', {
		id: 'permission',
		header: 'Permission',
		cell: ({ row }) => {
			const data = row.original
			if (data.type === 'group') {
				return data.groupKey
			}
			return data.label
		},
	}),
	columnHelper.display({
		id: 'enabled',
		header: 'Enabled',
		cell: () => null, // We handle this in the custom rendering
	}),
]

export const associatedPermissions: Record<UserPermission, UserPermission[]> = {
	[UserPermission.CreateBookClub]: [UserPermission.AccessBookClub],
	[UserPermission.AccessBookClub]: [],
	[UserPermission.EmailArbitrarySend]: [UserPermission.EmailSend],
	[UserPermission.EmailSend]: [UserPermission.EmailerRead],
	[UserPermission.EmailerCreate]: [UserPermission.EmailerRead],
	[UserPermission.EmailerRead]: [],
	[UserPermission.EmailerManage]: [UserPermission.EmailerCreate, UserPermission.EmailerRead],
	[UserPermission.AccessApiKeys]: [],
	[UserPermission.AccessKoreaderSync]: [],
	[UserPermission.AccessKoboSync]: [],
	[UserPermission.AccessSmartList]: [],
	[UserPermission.DownloadFile]: [],
	[UserPermission.FileExplorer]: [],
	[UserPermission.UploadFile]: [UserPermission.ScanLibrary],
	[UserPermission.CreateLibrary]: [UserPermission.EditLibrary],
	[UserPermission.EditLibrary]: [],
	[UserPermission.ScanLibrary]: [],
	[UserPermission.ManageLibrary]: [
		UserPermission.EditLibrary,
		UserPermission.ScanLibrary,
		UserPermission.EditThumbnails,
	],
	[UserPermission.DeleteLibrary]: [UserPermission.ManageLibrary],
	[UserPermission.CreateNotifier]: [UserPermission.ReadNotifier],
	[UserPermission.ReadNotifier]: [],
	[UserPermission.ManageNotifier]: [UserPermission.CreateNotifier, UserPermission.ReadNotifier],
	[UserPermission.DeleteNotifier]: [UserPermission.ManageNotifier],
	[UserPermission.ReadUsers]: [],
	[UserPermission.ManageUsers]: [UserPermission.ReadUsers],
	[UserPermission.ReadJobs]: [],
	[UserPermission.ManageJobs]: [UserPermission.ReadJobs],
	[UserPermission.ReadPersistedLogs]: [],
	[UserPermission.ReadSystemLogs]: [],
	[UserPermission.ManageServer]: [
		UserPermission.ManageUsers,
		UserPermission.ManageJobs,
		UserPermission.ReadPersistedLogs,
		UserPermission.ReadSystemLogs,
	],
	[UserPermission.EditMetadata]: [],
	[UserPermission.WriteBackMetadata]: [UserPermission.EditMetadata],
	[UserPermission.EditThumbnails]: [],
	[UserPermission.MetadataProviderRead]: [],
	[UserPermission.MetadataProviderManage]: [UserPermission.MetadataProviderRead],
	[UserPermission.MetadataFetchRecordRead]: [UserPermission.MetadataProviderRead],
	[UserPermission.MetadataFetchRecordManage]: [UserPermission.MetadataFetchRecordRead],
	[UserPermission.ChangePassword]: [],
	[UserPermission.ChangeUsername]: [],
	[UserPermission.ChangeAvatar]: [],
}
