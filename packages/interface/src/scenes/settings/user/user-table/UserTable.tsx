import { Badge, Text } from '@stump/components'
import { User } from '@stump/types'
import { createColumnHelper, getCoreRowModel } from '@tanstack/react-table'
import dayjs from 'dayjs'

import Table from '../../../../components/table/Table'
import { useUserManagementContext } from '../context'
import UserActionMenu from './UserActionMenu'
import UsernameRow from './UsernameRow'

// TODO: eventually I'd like to integrate some RBAC management here, as well. E.g.
// 1. See all of the reading lists a user has access to
// 2. Revoke access to a reading list
// 3. Grant access to a reading list
// 4. etc.

const columnHelper = createColumnHelper<User>()

const baseColumns = [
	columnHelper.accessor('username', {
		cell: ({ row: { original: user } }) => <UsernameRow {...user} />,
		header: 'User',
	}),
	columnHelper.accessor('role', {
		cell: (info) => (
			<Text size="sm">
				{info.getValue<string>()?.toLowerCase() === 'server_owner' ? 'Admin' : 'Member'}
			</Text>
		),
		header: 'Role',
	}),
	columnHelper.accessor('created_at', {
		cell: ({
			row: {
				original: { created_at },
			},
		}) => (
			<Text size="sm" variant="muted">
				{dayjs(created_at).format('LL')}
			</Text>
		),
		header: 'Created at',
	}),
	columnHelper.accessor('last_login', {
		cell: ({
			row: {
				original: { last_login },
			},
		}) => (
			<Text size="sm" variant="muted">
				{last_login ? dayjs(last_login).format('LL') : 'Never'}
			</Text>
		),
		header: 'Last login',
	}),
	columnHelper.display({
		cell: ({ row: { original } }) => (
			<Badge size="xs" variant={original.is_locked ? 'error' : 'success'}>
				{original.is_locked ? 'Locked' : 'Active'}
			</Badge>
		),
		header: 'Status',
		id: 'is_locked',
	}),
	columnHelper.display({
		cell: ({ row: { original } }) => (
			<div className="inline-flex items-end md:w-2">
				<UserActionMenu user={original} />
			</div>
		),
		id: 'actions',
	}),
]

export default function UserTable() {
	const { users, pageCount, pagination, setPagination } = useUserManagementContext()

	// TODO: mobile columns less? or maybe scroll? idk what would be best UX

	return (
		<Table
			sortable
			columns={baseColumns}
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
