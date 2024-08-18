import { Badge, Card, Text, ToolTip } from '@stump/components'
import { User } from '@stump/types'
import { ColumnDef, createColumnHelper } from '@tanstack/react-table'
import dayjs from 'dayjs'
import { HelpCircle } from 'lucide-react'
import { useMemo, useState } from 'react'

import Table from '@/components/table/Table'

import { useUserManagementContext } from '../context'
import InspectUserSlideOver from './InspectUserSlideOver'
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
	columnHelper.display({
		cell: ({
			row: {
				original: { is_server_owner },
			},
		}) => <Text size="sm">{is_server_owner ? 'Server Owner' : 'Member'}</Text>,
		header: 'Role',
		id: 'is_server_owner',
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
			<Text size="sm" variant="muted">
				{original.login_sessions_count}
			</Text>
		),
		header: () => (
			<div className="flex w-full items-center gap-2">
				<span>Sessions</span>
				<ToolTip content="The number of non-expired login sessions for this user">
					<HelpCircle className="h-3 w-3" />
				</ToolTip>
			</div>
		),
		id: 'login_sessions_count',
		size: 110,
	}),
	columnHelper.display({
		cell: ({ row: { original } }) => (
			<Badge size="xs" variant={original.is_locked ? 'error' : 'success'}>
				{original.is_locked ? 'Locked' : 'Active'}
			</Badge>
		),
		header: 'Status',
		id: 'is_locked',
		size: 100,
	}),
] as ColumnDef<User>[]

export default function UserTable() {
	const [inspectingUser, setInspectingUser] = useState<User | null>(null)
	const { users, pageCount, pagination, setPagination } = useUserManagementContext()

	// TODO: mobile columns less? or maybe scroll? idk what would be best UX

	const columns = useMemo(
		() => [
			...baseColumns,
			columnHelper.display({
				cell: ({ row: { original } }) => (
					<div className="inline-flex items-end md:w-2">
						<UserActionMenu
							user={original}
							onSelectForInspect={() => setInspectingUser(original)}
						/>
					</div>
				),
				id: 'actions',
				size: 28,
			}),
		],
		[],
	)

	return (
		<Card className="bg-background-surface p-1">
			<Table
				sortable
				columns={columns}
				options={{
					manualPagination: true,
					onPaginationChange: setPagination,
					pageCount,
					state: {
						columnPinning: {
							right: ['actions'],
						},
						pagination,
					},
				}}
				data={users}
				fullWidth
				cellClassName="bg-background-surface"
			/>
			<InspectUserSlideOver user={inspectingUser} onClose={() => setInspectingUser(null)} />
		</Card>
	)
}
