import { useEmailDevicesQuery } from '@stump/client'
import { Badge, Card, Heading, Text } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import { RegisteredEmailDevice } from '@stump/types'
import { ColumnDef, createColumnHelper } from '@tanstack/react-table'
import { CircleSlash2 } from 'lucide-react'
import React, { useMemo, useState } from 'react'

import { Table } from '@/components/table'

import { useEmailerSettingsContext } from '../context'
import DeleteDeviceConfirmation from './DeleteDeviceConfirmation'
import DeviceActionMenu from './DeviceActionMenu'

const columnHelper = createColumnHelper<RegisteredEmailDevice>()
const baseColumns = [
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
] as ColumnDef<RegisteredEmailDevice>[]

type Props = {
	onSelectForUpdate: (device: RegisteredEmailDevice | null) => void
}

export default function DevicesTable({ onSelectForUpdate }: Props) {
	const { t } = useLocaleContext()
	const { canEditEmailer } = useEmailerSettingsContext()
	const { devices } = useEmailDevicesQuery()

	const [deletingDevice, setDeletingDevice] = useState<RegisteredEmailDevice | null>(null)

	const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 })

	const columns = useMemo(
		() => [
			...baseColumns,
			columnHelper.display({
				cell: ({ row: { original: device } }) =>
					canEditEmailer ? (
						<DeviceActionMenu
							onEdit={() => onSelectForUpdate(device)}
							onDelete={() => setDeletingDevice(device)}
						/>
					) : null,
				id: 'actions',
				size: 0,
			}),
		],
		[onSelectForUpdate, canEditEmailer],
	)

	return (
		<>
			{canEditEmailer && (
				<DeleteDeviceConfirmation device={deletingDevice} onClose={() => setDeletingDevice(null)} />
			)}

			<Card className="bg-background-surface p-1">
				<Table
					sortable
					columns={columns}
					options={{
						onPaginationChange: setPagination,
						state: {
							columnPinning: canEditEmailer ? { right: ['actions'] } : undefined,
							pagination,
						},
					}}
					data={devices}
					fullWidth
					emptyRenderer={() => (
						<div className="flex min-h-[150px] flex-col items-center justify-center gap-2">
							<CircleSlash2 className="h-10 w-10 pb-2 pt-1 text-foreground-muted" />
							<div className="text-center">
								<Heading size="sm">{t(`${LOCALE_BASE}.emptyHeading`)}</Heading>
								<Text size="sm" variant="muted">
									{t(`${LOCALE_BASE}.emptySubtitle`)}
								</Text>
							</div>
						</div>
					)}
					isZeroBasedPagination
					cellClassName="bg-background-surface"
				/>
			</Card>
		</>
	)
}

const LOCALE_BASE = 'settingsScene.server/email.sections.devices.table'
