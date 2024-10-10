import { useBookClubMembersQuery } from '@stump/client'
import { Avatar, Card } from '@stump/components'
import { BookClubMember, BookClubMemberRoleSpec } from '@stump/sdk'
import { ColumnDef, createColumnHelper } from '@tanstack/react-table'
import upperFirst from 'lodash.upperfirst'
import React, { useMemo, useState } from 'react'

import { Table } from '@/components/table'

import { useBookClubManagement } from '../context'

export default function MembersTable() {
	const {
		club: { id, member_role_spec },
	} = useBookClubManagement()
	// TODO: implement backend pagination for better scalability
	const { members } = useBookClubMembersQuery({ id, suspense: true })

	const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 })
	const pageCount = useMemo(
		() => Math.ceil(members?.length ?? 0 / pagination.pageSize),
		[members, pagination.pageSize],
	)

	const columns = useMemo(() => createBaseColumns(member_role_spec), [member_role_spec])

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
				data={members ?? []}
				fullWidth
				cellClassName="bg-background-surface"
			/>
		</Card>
	)
}

const columnHelper = createColumnHelper<BookClubMember>()

const createBaseColumns = (spec: BookClubMemberRoleSpec) =>
	[
		columnHelper.accessor(({ display_name, user }) => display_name ?? user?.username, {
			cell: ({
				row: {
					original: { user, display_name },
				},
			}) => (
				<div className="flex items-center">
					<Avatar
						className="mr-2"
						src={user?.avatar_url ?? undefined}
						fallback={display_name || user?.username}
					/>

					<span>{display_name || user?.username}</span>
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
	] as ColumnDef<BookClubMember>[]
