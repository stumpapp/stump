import { useLoginActivityQuery } from '@stump/client'
import { Badge, Card, Text } from '@stump/components'
import { LoginActivity } from '@stump/sdk'
import {
	ColumnDef,
	createColumnHelper,
	getPaginationRowModel,
	PaginationState,
} from '@tanstack/react-table'
import dayjs from 'dayjs'
import { Fingerprint, Slash } from 'lucide-react'
import { useState } from 'react'

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
			<Text className="line-clamp-1" size="sm">
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

	if (!loginActivity?.length && !pagination.pageIndex) {
		return (
			<Card className="flex items-center justify-center border-dashed border-edge-subtle p-6">
				<div className="flex flex-col space-y-3">
					<div className="relative flex justify-center">
						<span className="flex items-center justify-center rounded-lg bg-background-surface p-2">
							<Fingerprint className="h-6 w-6 text-foreground-muted" />
							<Slash className="absolute h-6 w-6 scale-x-[-1] transform text-foreground opacity-80" />
						</span>
					</div>

					<div className="text-center">
						<Text>No login activity</Text>
						<Text size="sm" variant="muted">
							No users have logged in yet, or the data has been cleared
						</Text>
					</div>
				</div>
			</Card>
		)
	}

	// FIXME: doesn't scale well on mobile
	return (
		<Card>
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
