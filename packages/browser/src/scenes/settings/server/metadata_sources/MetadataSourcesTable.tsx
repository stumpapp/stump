import { useMetadataSourcesQuery, useSDK } from '@stump/client'
import { Card, Switch, Text } from '@stump/components'
import { MetadataSourceEntry } from '@stump/sdk'
import { ColumnDef, createColumnHelper } from '@tanstack/react-table'
import { useCallback, useMemo } from 'react'

import { Table } from '@/components/table'

const columnHelper = createColumnHelper<MetadataSourceEntry>()

export default function MetadataSourcesTable() {
	const { sdk } = useSDK()
	const { sources, refetch } = useMetadataSourcesQuery()

	const setSourceEnabled = useCallback(
		async (source: MetadataSourceEntry, enabled: boolean) => {
			source.enabled = enabled
			await sdk.metadata_sources.putMetadataSource(source)
			await refetch()
		},
		[sdk, refetch],
	)

	const columns = useMemo(
		() =>
			[
				columnHelper.accessor('id', {
					cell: ({ row: { original: source } }) => <Text size="sm">{source.id}</Text>,
					header: 'Id',
				}),
				columnHelper.accessor('enabled', {
					cell: ({ row: { original: source } }) => {
						return (
							<Switch
								label=""
								checked={source.enabled}
								onCheckedChange={(checked) => setSourceEnabled(source, checked)}
							/>
						)
					},
					header: 'Enabled',
				}),
			] as ColumnDef<MetadataSourceEntry, string>[],
		[setSourceEnabled],
	)

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
