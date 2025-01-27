import { useMetadataSourcesQuery, useSDK } from '@stump/client'
import { Card, IconButton, Switch, Text } from '@stump/components'
import { MetadataSourceEntry } from '@stump/sdk'
import { ColumnDef, createColumnHelper } from '@tanstack/react-table'
import { Settings } from 'lucide-react'
import { Suspense, useCallback, useMemo, useState } from 'react'

import { Table } from '@/components/table'

import MetadataSourceConfigModal from './MetadataSourceConfigModal'

const columnHelper = createColumnHelper<MetadataSourceEntry>()

export default function MetadataSourcesTable() {
	const { sdk } = useSDK()
	const { sources, refetch } = useMetadataSourcesQuery()

	const [selectedSource, setSelectedSource] = useState<MetadataSourceEntry | null>(null)
	const [modalIsOpen, setModalIsOpen] = useState(false)

	const setSourceEnabled = useCallback(
		async (source: MetadataSourceEntry, enabled: boolean) => {
			source.enabled = enabled
			await sdk.metadata_sources.put(source)
			await refetch()
		},
		[sdk, refetch],
	)

	const handleOpenModal = useCallback((source: MetadataSourceEntry) => {
		setSelectedSource(source)
		setModalIsOpen(true)
	}, [])

	const handleCloseModal = useCallback(() => {
		setModalIsOpen(false)
		setSelectedSource(null)
	}, [])

	const columns = useMemo(
		() =>
			[
				columnHelper.accessor('name', {
					cell: ({ row: { original: source } }) => <Text size="sm">{source.name}</Text>,
					header: 'Name',
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
				columnHelper.accessor('config', {
					cell: ({ row: { original: source } }) => {
						if (source.config == null) {
							return <></>
						} else {
							return (
								<IconButton variant="subtle" size="sm" onClick={() => handleOpenModal(source)}>
									<Settings className="h-4 w-4" />
								</IconButton>
							)
						}
					},
					header: 'Config',
				}),
			] as ColumnDef<MetadataSourceEntry, string>[],
		[setSourceEnabled, handleOpenModal],
	)

	return (
		<>
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

			<Suspense fallback={null}>
				{selectedSource && (
					<MetadataSourceConfigModal
						isOpen={modalIsOpen}
						source={selectedSource}
						onClose={handleCloseModal}
					/>
				)}
			</Suspense>
		</>
	)
}
