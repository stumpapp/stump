import { CheckBox, Heading, Link, Text } from '@stump/components'
import { UserPermission } from '@stump/graphql'
import { useLocaleContext } from '@stump/i18n'
import { createColumnHelper, getCoreRowModel, useReactTable } from '@tanstack/react-table'
import { useCallback, useEffect, useMemo } from 'react'
import { useFormContext } from 'react-hook-form'

import paths from '@/paths'

import { CreateOrUpdateUserSchema } from './schema'

export default function UserPermissionsTable() {
	const { t } = useLocaleContext()

	const form = useFormContext<CreateOrUpdateUserSchema>()

	const selectedPermissions = form.watch('permissions')

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
			const groupPermissions = groups.find((group) => group.name === groupId)?.permissions ?? []
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
				{ type: 'group', name: group.name, id: group.name, permissions: group.permissions },
				...group.permissions.map((permission) => ({
					type: 'permission' as const,
					permission,
					groupId: group.name,
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
		<div className="flex flex-col gap-4">
			<div>
				<Heading size="sm">{t(getLocaleKey('heading'))}</Heading>
				<Text size="sm" variant="muted" className="mt-1">
					{renderDescription()}
				</Text>
			</div>
			<div className="h-96 overflow-auto rounded-lg border border-edge">
				<table className="w-full">
					<tbody>
						{table.getRowModel().rows.map((row) => {
							const isGroup = row.original.type === 'group'
							const isPermission = row.original.type === 'permission'

							if (isGroup) {
								const groupData = row.original as Extract<TableRow, { type: 'group' }>

								return (
									<tr
										key={row.id}
										className="sticky top-0 z-10 border-b border-edge bg-background backdrop-blur-sm"
									>
										<td className="bg-background-surface/50 px-4 py-3 font-semibold text-foreground">
											{groupData.name}
										</td>
										<td className="bg-background-surface/50 px-4 py-3">
											{/* <input
											type="checkbox"
											className="h-4 w-4 rounded border-edge text-blue-600 focus:ring-blue-500"
											readOnly
										/> */}
											<CheckBox
												id={groupData.id}
												variant="primary"
												name={groupData.id}
												checked={groupData.permissions.every(
													(p) => selectedPermissions?.includes(p) ?? false,
												)}
												onClick={() => handleGroupClick(groupData.name)}
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
										className="hover:bg-muted/50 border-b border-edge transition-colors"
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
												variant="primary"
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
	| { type: 'group'; name: string; id: string; permissions: UserPermission[] }
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
		name: 'Feature Access',
		permissions: [
			UserPermission.AccessApiKeys,
			UserPermission.AccessBookClub,
			UserPermission.AccessKoreaderSync,
			UserPermission.AccessSmartList,
		],
	},
	{
		name: 'File Management',
		permissions: [
			UserPermission.DownloadFile,
			UserPermission.FileExplorer,
			UserPermission.UploadFile,
		],
	},
	{
		name: 'Emailers',
		permissions: [
			UserPermission.EmailerRead,
			UserPermission.EmailerCreate,
			UserPermission.EmailerManage,
		],
	},
	{
		name: 'Emailing',
		permissions: [UserPermission.EmailSend, UserPermission.EmailArbitrarySend],
	},
	{
		name: 'Library Management',
		permissions: [
			UserPermission.CreateLibrary,
			UserPermission.EditLibrary,
			UserPermission.ScanLibrary,
			UserPermission.ManageLibrary,
			UserPermission.DeleteLibrary,
		],
	},
	{
		name: 'User Management',
		permissions: [UserPermission.ReadUsers, UserPermission.ManageUsers],
	},
	{
		name: 'Server Management',
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
				return data.name
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
	[UserPermission.AccessSmartList]: [],
	[UserPermission.DownloadFile]: [],
	[UserPermission.FileExplorer]: [],
	[UserPermission.UploadFile]: [UserPermission.ScanLibrary],
	[UserPermission.CreateLibrary]: [UserPermission.EditLibrary],
	[UserPermission.EditLibrary]: [],
	[UserPermission.ScanLibrary]: [],
	[UserPermission.ManageLibrary]: [UserPermission.EditLibrary, UserPermission.ScanLibrary],
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
}
