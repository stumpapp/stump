import { useSDK, useSuspenseGraphQL } from '@stump/client'
import { Badge, Card, Text } from '@stump/components'
import { graphql, LoginActivityTableQuery } from '@stump/graphql'
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

const query = graphql(`
	query LoginActivityTable {
		loginActivity {
			id
			ipAddress
			userAgent
			authenticationSuccessful
			timestamp
			user {
				id
				username
				avatarUrl
			}
		}
	}
`)

export type LoginActivity = LoginActivityTableQuery['loginActivity'][number]

export default function LoginActivityTable() {
	const { sdk } = useSDK()
	const {
		data: { loginActivity },
	} = useSuspenseGraphQL(query, sdk.cacheKey('loginActivity'))

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
							You cleared this, didn&#39;t you?
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
	columnHelper.accessor('ipAddress', {
		cell: ({ row: { original: activity } }) => (
			<Text className="line-clamp-1" size="sm">
				{activity.ipAddress}
			</Text>
		),
		header: 'IP address',
		size: 100,
	}),
	columnHelper.accessor('userAgent', {
		cell: ({ row: { original: activity } }) => (
			<Text
				size="sm"
				variant="muted"
				className="line-clamp-1 max-w-sm md:max-w-xl"
				title={activity.userAgent}
			>
				{activity.userAgent}
			</Text>
		),
		header: 'User-agent',
	}),
	columnHelper.display({
		cell: ({ row: { original: activity } }) => (
			<Badge variant={activity.authenticationSuccessful ? 'success' : 'error'} size="xs">
				{activity.authenticationSuccessful ? 'Success' : 'Failure'}
			</Badge>
		),
		header: 'Auth result',
		id: 'authenticationSuccessful',
	}),
] as ColumnDef<LoginActivity>[]
