import { useUsersQuery } from '@stump/client'
import { CheckBox, Text } from '@stump/components'
import { User } from '@stump/types'
import { ColumnDef, getCoreRowModel, getPaginationRowModel } from '@tanstack/react-table'
import dayjs from 'dayjs'
import { useMemo } from 'react'

import Table from '../../../../components/table/Table'
import { useLocaleContext } from '../../../../i18n/context'
import { useUserManagementContext } from '../context'
import UsernameRow from './UsernameRow'

// TODO: eventually I'd like to integrate some RBAC management here, as well. E.g.
// 1. See all of the reading lists a user has access to
// 2. Revoke access to a reading list
// 3. Grant access to a reading list
// 4. etc.

export default function UserTable() {
	const { t } = useLocaleContext()

	const { users } = useUserManagementContext()

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
						id: 'username',
					},
					{
						accessorKey: 'role',
						cell: (info) => {
							return (
								<Text size="sm">
									{info.getValue()?.toLowerCase() === 'server_owner' ? 'Admin' : 'Member'}
								</Text>
							)
						},
						header: 'Role',
						id: 'role',
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
				debugColumns: true,
				debugHeaders: true,
				// If only doing manual pagination, you don't need this
				debugTable: true,
				getCoreRowModel: getCoreRowModel(),
				// TODO: change to manual once API endpoint is ready
				getPaginationRowModel: getPaginationRowModel(),
			}}
			data={users}
			fullWidth
		/>
	)
}
