import { useSDK, useSuspenseGraphQL } from '@stump/client'
import { Badge, Card, Text } from '@stump/components'
import { EmailDevicesTableQuery, graphql } from '@stump/graphql'
import { useLocaleContext } from '@stump/i18n'
import { ColumnDef, createColumnHelper } from '@tanstack/react-table'
import { Slash, Smartphone } from 'lucide-react'
import { useMemo, useState } from 'react'

import { Table } from '@/components/table'

import { useEmailerSettingsContext } from '../context'
import DeleteDeviceConfirmation from './DeleteDeviceConfirmation'
import DeviceActionMenu from './DeviceActionMenu'

const query = graphql(`
	query EmailDevicesTable {
		emailDevices {
			id
			name
			email
			forbidden
		}
	}
`)

export type RegisteredEmailDevice = EmailDevicesTableQuery['emailDevices'][number]

type Props = {
	onSelectForUpdate: (device: RegisteredEmailDevice | null) => void
}

export default function DevicesTable({ onSelectForUpdate }: Props) {
	const { t } = useLocaleContext()
	const { canEditEmailer } = useEmailerSettingsContext()
	const { sdk } = useSDK()

	const {
		data: { emailDevices: devices },
	} = useSuspenseGraphQL(query, sdk.cacheKey('emailDevices'))

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

	if (!devices?.length) {
		return (
			<Card className="flex items-center justify-center border-dashed border-edge-subtle p-6">
				<div className="flex flex-col space-y-3">
					<div className="relative flex justify-center">
						<span className="flex items-center justify-center rounded-lg bg-background-surface p-2">
							<Smartphone className="h-6 w-6 text-foreground-muted" />
							<Slash className="absolute h-6 w-6 scale-x-[-1] transform text-foreground opacity-80" />
						</span>
					</div>

					<div className="text-center">
						<Text>{t(`${LOCALE_BASE}.emptyHeading`)}</Text>
						<Text size="sm" variant="muted">
							{t(`${LOCALE_BASE}.emptySubtitle`)}
						</Text>
					</div>
				</div>
			</Card>
		)
	}

	return (
		<>
			{canEditEmailer && (
				<DeleteDeviceConfirmation device={deletingDevice} onClose={() => setDeletingDevice(null)} />
			)}

			<Card>
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
					isZeroBasedPagination
					cellClassName="bg-background"
				/>
			</Card>
		</>
	)
}

const LOCALE_BASE = 'settingsScene.server/email.sections.devices.table'

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
