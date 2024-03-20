import { emailerApi, emailerQueryKeys } from '@stump/api'
import { useQuery } from '@stump/client'
import { Badge, Card, Heading, Text } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import { RegisteredEmailDevice } from '@stump/types'
import { createColumnHelper } from '@tanstack/react-table'
import { CircleSlash2 } from 'lucide-react'
import React, { useState } from 'react'

import { Table } from '@/components/table'

import CreateOrUpdateDeviceModal from './CreateOrUpdateDeviceModal'

const columnHelper = createColumnHelper<RegisteredEmailDevice>()
const columns = [
	columnHelper.accessor('name', {
		cell: ({ getValue }) => <Text size="sm">{getValue()}</Text>,
		header: () => (
			<Text size="sm" variant="muted">
				Name
			</Text>
		),
	}),
	columnHelper.accessor('email', {
		cell: ({ getValue }) => <Text size="sm">{getValue()}</Text>,
		header: () => (
			<Text size="sm" variant="muted">
				Email
			</Text>
		),
	}),
	columnHelper.display({
		cell: ({
			row: {
				original: { forbidden },
			},
		}) => (
			<Badge size="sm" variant={forbidden ? 'warning' : 'default'}>
				{forbidden ? 'Forbidden' : 'Allowed'}
			</Badge>
		),
		header: () => (
			<Text size="sm" variant="muted">
				Status
			</Text>
		),
		id: 'status',
	}),
]

export default function DevicesTable() {
	const { t } = useLocaleContext()
	const { data } = useQuery(
		[emailerQueryKeys.getEmailDevices],
		async () => {
			const { data } = await emailerApi.getEmailDevices()
			return data
		},
		{
			suspense: true,
		},
	)
	const devices = data || []

	const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 })

	const [updatingDevice, setUpdatingDevice] = useState<RegisteredEmailDevice | null>(null)

	return (
		<Card className="bg-background-200 p-1">
			<Table
				sortable
				columns={columns}
				options={{
					onPaginationChange: setPagination,
					state: {
						pagination,
					},
				}}
				data={devices}
				fullWidth
				emptyRenderer={() => (
					<div className="flex min-h-[150px] flex-col items-center justify-center gap-2">
						<CircleSlash2 className="h-10 w-10 pb-2 pt-1 text-muted" />
						<div className="text-center">
							<Heading size="sm">{t(`${LOCALE_BASE}.emptyHeading`)}</Heading>
							<Text size="sm" variant="muted">
								{t(`${LOCALE_BASE}.emptySubtitle`)}
							</Text>
						</div>
					</div>
				)}
				isZeroBasedPagination
			/>

			<CreateOrUpdateDeviceModal
				isOpen={!!updatingDevice}
				updatingDevice={updatingDevice}
				onClose={() => setUpdatingDevice(null)}
			/>
		</Card>
	)
}

const LOCALE_BASE = 'settingsScene.server/email.sections.devices.table'
