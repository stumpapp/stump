import { useLoginActivityQuery } from '@stump/client'
import { Badge, Card, Text } from '@stump/components'
import { LoginActivity } from '@stump/types'
import {
	ColumnDef,
	createColumnHelper,
	getPaginationRowModel,
	PaginationState,
} from '@tanstack/react-table'
import dayjs from 'dayjs'
import React, { useState } from 'react'

import { Table } from '@/components/table'

import UsernameRow from '../user-table/UsernameRow'

const columnHelper = createColumnHelper<LoginActivity>()

const baseColumns = [
	columnHelper.display({
		cell: ({
			row: {
				original: { user },
			},
		}) => {
			if (!user) {
				return null
			}

			return <UsernameRow {...user} />
		},
		header: 'User',
		id: 'user',
		size: 100,
	}),
	columnHelper.accessor('timestamp', {
		cell: ({ row: { original: activity } }) => (
			<Text title={dayjs(activity.timestamp).format('LLL')} className="line-clamp-1" size="sm">
				{dayjs(activity.timestamp).format('LLL')}
			</Text>
		),
		header: 'Timestamp',
		size: 100,
	}),
	columnHelper.accessor('ip_address', {
		cell: ({ row: { original: activity } }) => (
			<Text className="line-clamp-1 " size="sm">
				{activity.ip_address}
			</Text>
		),
		header: 'IP address',
		size: 100,
	}),
	columnHelper.accessor('user_agent', {
		cell: ({ row: { original: activity } }) => (
			<Text
				size="sm"
				variant="muted"
				className="line-clamp-1 max-w-sm md:max-w-xl"
				title={activity.user_agent}
			>
				{activity.user_agent}
			</Text>
		),
		header: 'User-agent',
	}),
	columnHelper.display({
		cell: ({ row: { original: activity } }) => (
			<Badge variant={activity.authentication_successful ? 'success' : 'error'} size="xs">
				{activity.authentication_successful ? 'Success' : 'Failure'}
			</Badge>
		),
		header: 'Auth result',
		id: 'authentication_successful',
	}),
] as ColumnDef<LoginActivity>[]

export default function LoginActivityTable() {
	const { loginActivity } = useLoginActivityQuery({})

	const [pagination, setPagination] = useState<PaginationState>({
		pageIndex: 0,
		pageSize: 10,
	})

	// FIXME: doesn't scale well on mobile
	return (
		<Card className="bg-background-surface p-1">
			<Table
				data={loginActivity || []}
				columns={baseColumns}
				fullWidth
				options={{
					defaultColumn: {
						minSize: 100,
						size: 150,
					},
					getPaginationRowModel: getPaginationRowModel(),
					onPaginationChange: setPagination,
					state: {
						pagination,
					},
				}}
				isZeroBasedPagination
			/>
		</Card>
	)
}
