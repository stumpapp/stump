import { Text } from '@stump/components'
import { User } from '@stump/types'
import { ColumnDef, getCoreRowModel } from '@tanstack/react-table'
import dayjs from 'dayjs'
import { useMemo, useState } from 'react'

import Table from '../../../../components/table/Table'
import { useUserManagementContext } from '../context'
import UserActionMenu from './UserActionMenu'
import UsernameRow from './UsernameRow'

// TODO: eventually I'd like to integrate some RBAC management here, as well. E.g.
// 1. See all of the reading lists a user has access to
// 2. Revoke access to a reading list
// 3. Grant access to a reading list
// 4. etc.

export default function UserTable() {
	const { users, pageCount, pagination, setPagination } = useUserManagementContext()

	// TODO: mobile columns less? or maybe scroll? idk what would be best UX
	// FIXME: sorting not working (because tied to query and needs state :weary:)
	// TODO: https://tanstack.com/table/v8/docs/examples/react/row-selection
	const columns = useMemo<ColumnDef<User>[]>(
		() => [
			{
				accessorKey: 'username',
				cell: (info) => {
					const user = info.row.original
					return <UsernameRow {...user} />
				},
				header: 'Username',
			},
			{
				accessorKey: 'role',
				// TODO: This will probably change once another role (or two?) is added. RBAC
				// system is not fully thought out yet.
				cell: (info) => {
					return (
						<Text size="sm">
							{info.getValue<string>()?.toLowerCase() === 'server_owner' ? 'Admin' : 'Member'}
						</Text>
					)
				},
				header: 'Role',
			},
			{
				accessorKey: 'created_at',
				cell: ({ row }) => {
					return (
						<Text size="sm" variant="muted">
							{dayjs(row.original.created_at).format('LL')}
						</Text>
					)
				},
				header: 'Created at',
			},
			{
				cell: ({ row }) => {
					const renderDate = () => {
						if (row.original.last_login) {
							return dayjs(row.original.last_login).format('LL')
						} else {
							return 'Never'
						}
					}
					return (
						<Text size="sm" variant="muted">
							{renderDate()}
						</Text>
					)
				},
				header: 'Last Login',
				id: 'lastLogin',
			},
			{
				cell: ({ row }) => (
					<div className="inline-flex items-end md:w-2">
						<UserActionMenu user={row.original} />
					</div>
				),
				id: 'actions',
			},
		],
		[],
	)

	return (
		<Table
			sortable
			columns={columns}
			options={{
				getCoreRowModel: getCoreRowModel(),
				manualPagination: true,
				onPaginationChange: setPagination,
				pageCount,
				state: {
					pagination,
				},
			}}
			data={users}
			fullWidth
		/>
	)
}
