import { useLoginActivityQuery } from '@stump/client'
import { Avatar, Badge, Text, ToolTip } from '@stump/components'
import { LoginActivity } from '@stump/types'
import { createColumnHelper, getCoreRowModel } from '@tanstack/react-table'
import dayjs from 'dayjs'
import React from 'react'

import { Table } from '../../../components/table'

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

			return (
				<ToolTip content={user.username}>
					<Avatar className="h-8 w-8" src={user.avatar_url || undefined} fallback={user.username} />
				</ToolTip>
			)
		},
		id: 'user',
	}),
	columnHelper.accessor('timestamp', {
		cell: ({ row: { original: activity } }) => (
			<Text size="sm">{dayjs(activity.timestamp).format('LLL')}</Text>
		),
		header: 'Timestamp',
	}),
	columnHelper.accessor('ip_address', {
		cell: ({ row: { original: activity } }) => <Text size="sm">{activity.ip_address}</Text>,
		header: 'IP Address',
	}),
	columnHelper.accessor('user_agent', {
		cell: ({ row: { original: activity } }) => (
			<Text size="sm" variant="muted">
				{activity.user_agent}
			</Text>
		),
		header: 'User-agent',
	}),
	columnHelper.display({
		cell: ({ row: { original: activity } }) => (
			<Badge variant={activity.authentication_successful ? 'success' : 'error'} size="xs">
				{activity.authentication_successful ? 'Successful' : 'Failure'}
			</Badge>
		),
		header: '',
		id: 'authentication_successful',
	}),
]

// TODO: add pagination
export default function LoginActivityTable() {
	const { loginActivity } = useLoginActivityQuery({})

	return (
		<Table
			data={loginActivity || []}
			columns={baseColumns}
			fullWidth
			options={{
				getCoreRowModel: getCoreRowModel(),
			}}
		/>
	)
}
