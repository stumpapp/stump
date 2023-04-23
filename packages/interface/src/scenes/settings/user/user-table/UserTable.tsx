import { CheckBox, Text } from '@stump/components'
import { User } from '@stump/types'
import { ColumnDef, getCoreRowModel } from '@tanstack/react-table'
import dayjs from 'dayjs'
import { useMemo } from 'react'

import Table from '../../../../components/table/Table'
import { useUserManagementContext } from '../context'
import UsernameRow from './UsernameRow'

// TODO: eventually I'd like to integrate some RBAC management here, as well. E.g.
// 1. See all of the reading lists a user has access to
// 2. Revoke access to a reading list
// 3. Grant access to a reading list
// 4. etc.

const debugFlag = import.meta.env.DEV

export default function UserTable() {
	const { users, pageCount, pagination, setPagination } = useUserManagementContext()

	// TODO: mobile columns less? or maybe scroll? idk what would be best UX
	const columns = useMemo<ColumnDef<User>[]>(
		() => [
			{
				columns: [
					{
						cell: () => {
							// const user = info.row.original
							return <CheckBox variant="primary" />
						},
						header: <CheckBox variant="primary" />,
						id: 'select',
					},
					{
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
									{info.getValue()?.toLowerCase() === 'server_owner' ? 'Admin' : 'Member'}
								</Text>
							)
						},
						header: 'Role',
					},
					{
						cell: () => {
							return (
								<Text size="sm" variant="muted">
									{dayjs().format('LL')}
								</Text>
							)
						},
						header: 'Last Seen',
						id: 'username',
					},
				],
				enableGrouping: false,
				id: 'user',
			},
		],
		[],
	)

	return (
		<Table
			sortable
			searchable
			columns={columns}
			options={{
				debugColumns: debugFlag,
				debugHeaders: debugFlag,
				debugTable: debugFlag,
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
