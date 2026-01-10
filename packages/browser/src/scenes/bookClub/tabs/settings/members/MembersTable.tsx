import { useGraphQLMutation, useSDK, useSuspenseGraphQL } from '@stump/client'
import { Avatar, Card } from '@stump/components'
import { BookClubMembersTableQuery, graphql } from '@stump/graphql'
import { BookClubMemberRoleSpec } from '@stump/sdk'
import { ColumnDef, createColumnHelper } from '@tanstack/react-table'
import upperFirst from 'lodash/upperFirst'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'

import { Table } from '@/components/table'
import { useAppContext } from '@/context'

import { useBookClubManagement } from '../context'
import MemberActionMenu from './MemberActionMenu'
import RemoveMemberConfirmation from './RemoveMemberConfirmation'

const query = graphql(`
	query BookClubMembersTable($id: ID!) {
		bookClubById(id: $id) {
			id
			members {
				id
				avatarUrl
				isCreator
				displayName
				role
				userId
			}
		}
	}
`)

const removeMutation = graphql(`
	mutation RemoveBookClubMember($bookClubId: ID!, $memberId: ID!) {
		removeBookClubMember(bookClubId: $bookClubId, memberId: $memberId) {
			id
		}
	}
`)

export default function MembersTable() {
	const { sdk } = useSDK()
	const { user } = useAppContext()
	const {
		club: { id, roleSpec },
	} = useBookClubManagement()

	// TODO: implement backend pagination for better scalability
	const {
		data: {
			bookClubById: { members },
		},
		refetch,
	} = useSuspenseGraphQL(query, sdk.cacheKey('bookClubById', [id, 'members']), { id })

	const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 })
	const pageCount = useMemo(
		() => Math.ceil(members?.length ?? 0 / pagination.pageSize),
		[members, pagination.pageSize],
	)

	const [removingMember, setRemovingMember] = useState<Member | null>(null)

	const { mutate: removeMember } = useGraphQLMutation(removeMutation, {
		onSuccess: () => refetch(),
		onError: (error) => {
			console.error('Error removing member:', error)
			toast.error('Failed to remove member')
		},
	})

	const columns = useMemo(
		() => [
			...createBaseColumns(roleSpec),
			columnHelper.display({
				id: 'actions',
				cell: ({ row: { original } }) => {
					if (original.userId === user?.id || original.isCreator) {
						return null
					}

					return <MemberActionMenu onSelectForRemoval={() => setRemovingMember(original)} />
				},
			}),
		],
		[roleSpec, user],
	)

	return (
		<>
			<RemoveMemberConfirmation
				isOpen={!!removingMember}
				onClose={(didConfirm) => {
					if (didConfirm && removingMember) {
						removeMember({
							bookClubId: id,
							memberId: removingMember.id,
						})
					}
					setRemovingMember(null)
				}}
			/>
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
					data={members ?? []}
					fullWidth
					cellClassName="bg-background"
				/>
			</Card>
		</>
	)
}

type Member = BookClubMembersTableQuery['bookClubById']['members'][number]

const columnHelper = createColumnHelper<Member>()

const createBaseColumns = (spec: BookClubMemberRoleSpec) =>
	[
		columnHelper.accessor(({ displayName }) => displayName, {
			cell: ({
				row: {
					original: { avatarUrl, displayName },
				},
			}) => (
				<div className="flex items-center">
					<Avatar className="mr-2" src={avatarUrl ?? undefined} fallback={displayName} />
					<span>{displayName}</span>
				</div>
			),
			header: 'Member',
			id: 'display_name',
		}),
		columnHelper.accessor('role', {
			cell: ({ getValue }) => (
				<span>{spec[getValue()] || upperFirst(getValue().toLowerCase())}</span>
			),
			header: 'Role',
		}),
	] as ColumnDef<Member>[]
