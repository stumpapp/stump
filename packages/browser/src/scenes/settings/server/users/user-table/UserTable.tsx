import { useGraphQL, useSDK } from '@stump/client'
import { Badge, Card, Text, ToolTip } from '@stump/components'
import { graphql, UserTableQuery } from '@stump/graphql'
import { ColumnDef, createColumnHelper, PaginationState } from '@tanstack/react-table'
import dayjs from 'dayjs'
import { HelpCircle } from 'lucide-react'
import { useMemo, useState } from 'react'

import Table from '@/components/table/Table'

import DeleteUserModal from './DeleteUserModal'
import InspectUserSlideOver from './InspectUserSlideOver'
import UserActionMenu from './UserActionMenu'
import UsernameRow from './UsernameRow'

// TODO: eventually I'd like to integrate some RBAC management here, as well. E.g.
// 1. See all of the reading lists a user has access to
// 2. Revoke access to a reading list
// 3. Grant access to a reading list
// 4. etc.

const query = graphql(`
	query UserTable($pagination: Pagination!) {
		users(pagination: $pagination) {
			nodes {
				id
				avatarUrl
				username
				isServerOwner
				isLocked
				createdAt
				lastLogin
				loginSessionsCount
			}
			pageInfo {
				__typename
				... on OffsetPaginationInfo {
					totalPages
					currentPage
					pageSize
					pageOffset
					zeroBased
				}
			}
		}
	}
`)

export type User = NonNullable<NonNullable<UserTableQuery>['users']>['nodes'][number]

export default function UserTable() {
	const [pagination, setPagination] = useState<PaginationState>({
		pageIndex: 0,
		pageSize: 10,
	})
	const [inspectingUser, setInspectingUser] = useState<User | null>(null)
	const [deletingUser, setDeletingUser] = useState<User | null>(null)

	const { sdk } = useSDK()
	const { data } = useGraphQL(
		query,
		sdk.cacheKey('users', [pagination]),
		{
			pagination: {
				offset: {
					page: pagination.pageIndex + 1,
					pageSize: pagination.pageSize,
				},
			},
		},
		{ placeholderData: (prev) => prev },
	)
	const users = data?.users.nodes || []

	if (!!data?.users?.pageInfo && data.users.pageInfo.__typename !== 'OffsetPaginationInfo') {
		throw new Error(
			'Expected users query to return OffsetPaginationInfo, but got: ' +
				data.users.pageInfo.__typename,
		)
	}

	const pageCount =
		data?.users.pageInfo.__typename === 'OffsetPaginationInfo' ? data.users.pageInfo.totalPages : -1

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
							onSelectForDeletion={() => setDeletingUser(original)}
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
		<Card>
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
				cellClassName="bg-background"
			/>
			<InspectUserSlideOver user={inspectingUser} onClose={() => setInspectingUser(null)} />
			<DeleteUserModal deletingUser={deletingUser} onClose={() => setDeletingUser(null)} />
		</Card>
	)
}

const columnHelper = createColumnHelper<User>()

const baseColumns = [
	columnHelper.accessor('username', {
		cell: ({ row: { original: user } }) => <UsernameRow {...user} />,
		header: 'User',
	}),
	columnHelper.display({
		cell: ({
			row: {
				original: { isServerOwner },
			},
		}) => <Text size="sm">{isServerOwner ? 'Server Owner' : 'Member'}</Text>,
		header: 'Role',
		id: 'isServerOwner',
	}),
	columnHelper.accessor('createdAt', {
		cell: ({
			row: {
				original: { createdAt },
			},
		}) => (
			<Text size="sm" variant="muted">
				{dayjs(createdAt).format('LL')}
			</Text>
		),
		header: 'Created at',
	}),
	columnHelper.accessor('lastLogin', {
		cell: ({
			row: {
				original: { lastLogin },
			},
		}) => (
			<Text size="sm" variant="muted">
				{lastLogin ? dayjs(lastLogin).format('LL') : 'Never'}
			</Text>
		),
		header: 'Last login',
	}),
	columnHelper.display({
		cell: ({ row: { original } }) => (
			<Text size="sm" variant="muted">
				{original.loginSessionsCount}
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
		id: 'loginSessionsCount',
		size: 110,
	}),
	columnHelper.display({
		cell: ({ row: { original } }) => (
			<Badge size="xs" variant={original.isLocked ? 'error' : 'success'}>
				{original.isLocked ? 'Locked' : 'Active'}
			</Badge>
		),
		header: 'Status',
		id: 'isLocked',
		size: 100,
	}),
] as ColumnDef<User>[]
