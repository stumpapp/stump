import { useMetadataSourcesQuery, useSDK } from '@stump/client'
import { Card, Switch, Text } from '@stump/components'
import { MetadataSourceEntry } from '@stump/sdk'
import { ColumnDef, createColumnHelper } from '@tanstack/react-table'

import { Table } from '@/components/table'

const columnHelper = createColumnHelper<MetadataSourceEntry>()

export default function MetadataSourcesTable() {
	const { sdk } = useSDK()
	const { sources, refetch } = useMetadataSourcesQuery()

	const setSourceEnabled = async (source: MetadataSourceEntry, enabled: boolean) => {
		source.enabled = enabled
		await sdk.metadata_sources.putMetadataSource(source)
		await refetch()
	}

	const columns = [
		columnHelper.accessor('id', {
			cell: ({ getValue }) => <Text size="sm">{getValue()}</Text>,
			header: 'Id',
		}),
		columnHelper.accessor('enabled', {
			cell: ({ getValue, row }) => {
				const isEnabled = getValue()
				return (
					<Switch
						label=""
						checked={isEnabled}
						onCheckedChange={(checked) => setSourceEnabled(row.original, checked)}
					/>
				)
			},
			header: 'Enabled',
		}),
	] as ColumnDef<MetadataSourceEntry, string>[]

	return (
		<Card className="bg-background-surface p-1">
			<Table
				sortable
				columns={columns}
				data={sources}
				options={{}}
				emptyRenderer={() => (
					<div className="p-4 text-center">
						<Text size="sm" variant="muted">
							No metadata sources found.
						</Text>
					</div>
				)}
			/>
		</Card>
	)
}
