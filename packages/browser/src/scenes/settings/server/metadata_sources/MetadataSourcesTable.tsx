import { useMetadataSourcesQuery } from '@stump/client'
import { Card, Switch, Text } from '@stump/components'
import { MetadataSourceEntry } from '@stump/sdk'
import { createColumnHelper } from '@tanstack/react-table'
import { useCallback, useMemo } from 'react'

import { Table } from '@/components/table'

// TODO - Make less broken

const columnHelper = createColumnHelper<MetadataSourceEntry>()

export default function MetadataSourcesTable() {
	const { sources } = useMetadataSourcesQuery()

	const handleToggleEnabled = useCallback((source: MetadataSourceEntry, enabled: boolean) => {
		console.log(`Toggling ${source.id} to enabled = ${enabled}`)
	}, [])

	const baseColumns = [
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
						onCheckedChange={(checked) => handleToggleEnabled(row.original, checked)}
					/>
				)
			},
			header: 'Enabled',
		}),
	]

	return (
		<Card className="bg-background-surface p-1">
			<Table
				sortable
				columns={baseColumns}
				data={sources}
				options={{}}
				emptyRenderer={() => (
					<div className="p-4 text-center">
						<Text size="sm" variant="muted">
							No metadata sources found.
						</Text>
					</div>
				)}
			></Table>
		</Card>
	)
}
