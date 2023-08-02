import { CheckBox, Text } from '@stump/components'
import { User } from '@stump/types'
import { ColumnDef, getCoreRowModel } from '@tanstack/react-table'
import dayjs from 'dayjs'
import { useCallback, useMemo } from 'react'

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
	const { users, pageCount, pagination, setPagination, selectedUser, setSelectedUser } =
		useUserManagementContext()

	const handleSelectUser = useCallback(
		(userId: string) => {
			if (selectedUser?.id === userId) {
				setSelectedUser(null)
			} else {
				const user = users.find((u) => u.id === userId)
				setSelectedUser(user || null)
			}
		},
		[selectedUser, users, setSelectedUser],
	)

	// TODO: mobile columns less? or maybe scroll? idk what would be best UX
	// FIXME: sorting not working (because tied to query and needs state :weary:)
	// TODO: https://tanstack.com/table/v8/docs/examples/react/row-selection
	const columns = useMemo<ColumnDef<User>[]>(
		() => [
			{
				cell: (info) => {
					const user = info.row.original
					const isSelected = selectedUser?.id === user.id
					return (
						<CheckBox
							variant="primary"
							checked={isSelected}
							onClick={() => handleSelectUser(user.id)}
						/>
					)
				},
				// header: <CheckBox variant="primary" />,
				id: 'select',
			},
			{
				cell: (info) => {
					const user = info.row.original
					return <UsernameRow {...user} />
				},
				// enableSorting: true,
				header: 'Username',
				// sortingFn: (a, b) => {
				// 	const aUser = a.original
				// 	const bUser = b.original

				// 	return aUser.username.localeCompare(bUser.username)
				// },
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
		[selectedUser, handleSelectUser],
	)

	return (
		<Table
			sortable
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
