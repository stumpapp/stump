import { useGraphQLMutation, useSuspenseGraphQL } from '@stump/client'
import { Badge, Button, Card, Text } from '@stump/components'
import { graphql, useFragment } from '@stump/graphql'
import { useLocaleContext } from '@stump/i18n'
import { useQueryClient } from '@tanstack/react-query'
import {
	ColumnDef,
	createColumnHelper,
	getPaginationRowModel,
	PaginationState,
} from '@tanstack/react-table'
import { Eye } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { toast } from 'sonner'

import Table from '@/components/table/Table'

import { ConfidenceBadge } from './reviewDialog/ConfidenceBadge'
import { MatchRecord } from './types'
import { useMatchReviewStore } from './useMatchReviewStore'

// TODO: a CHONKER fragment, should prolly break it up

const fragment = graphql(`
	fragment PendingMatchRecord on MetadataFetchRecord {
		id
		status
		mediaId
		seriesId
		matchCandidates {
			provider
			externalId
			metadata {
				__typename
				... on ExternalMediaMetadata {
					title
					seriesName
					seriesExternalId
					summary
					pageCount
					number
					day
					month
					year
					genres
					tags
					isbn
					isbn13
					writers
					artists
					colorists
					letterers
					coverArtists
				}
				... on ExternalSeriesMetadata {
					seriesTitle: title
					alternativeTitles
					summary
					volumeCount
					coverUrl
					status
					year
					endYear
					genres
					tags
					authors
					ageRating
					publisher
				}
			}
			confidence
			confidenceFactors {
				factor
				weight
				matched
			}
		}
		addedAt
		updatedAt
		media {
			id
			resolvedName
			metadata {
				title
				summary
				genres
				writers
				colorists
				letterers
				coverArtists
				publisher
				year
				month
				day
				pageCount
				identifierIsbn
				lockedFields
			}
		}
		series {
			id
			resolvedName
			metadata {
				title
				summary
				genres
				writers
				publisher
				year
				status
				ageRating
				volume
				lockedFields
			}
		}
	}
`)

const pendingMatchesQuery = graphql(`
	query PendingMetadataMatches {
		pendingMetadataMatches {
			...PendingMatchRecord
		}
	}
`)

const acceptAllPendingMatchesMutation = graphql(`
	mutation AcceptAllPendingMatches($strategy: MergeStrategy, $excludeFields: [MetadataField!]) {
		acceptAllPendingMatches(strategy: $strategy, excludeFields: $excludeFields)
	}
`)

const rejectAllPendingMatchesMutation = graphql(`
	mutation RejectAllPendingMatches {
		rejectAllPendingMatches
	}
`)

type PendingMatchRow = {
	id: number
	entityName: string
	entityType: 'Media' | 'Series'
	entityId: string
	candidateCount: number
	topConfidence: number | null
	addedAt: string
	record: MatchRecord
}

const columnHelper = createColumnHelper<PendingMatchRow>()

function ReviewButton({ records, startIndex }: { records: MatchRecord[]; startIndex: number }) {
	const open = useMatchReviewStore((s) => s.open)
	return (
		<div className="md:w-2 inline-flex items-end">
			<Button
				size="icon"
				variant="ghost"
				className="h-7 w-7 shrink-0"
				title="Review match"
				onClick={() => open(records, startIndex)}
			>
				<Eye className="h-4 w-4" />
			</Button>
		</div>
	)
}

// TODO: Intake optional ids for series or library, so we can fetch only relevant matches

export function PendingMatchesTable() {
	const { t } = useLocaleContext()
	const { data } = useSuspenseGraphQL(pendingMatchesQuery, ['pendingMetadataMatches'])

	const records = useFragment(fragment, data.pendingMetadataMatches)
	const open = useMatchReviewStore((s) => s.open)
	const client = useQueryClient()

	const [pagination, setPagination] = useState<PaginationState>({
		pageIndex: 0,
		pageSize: 10,
	})

	const rows: PendingMatchRow[] = useMemo(
		() =>
			records.map((record) => {
				const candidates = record.matchCandidates
				const topCandidate = candidates[0]
				return {
					id: record.id,
					entityName: record.media?.resolvedName ?? record.series?.resolvedName ?? 'Unknown',
					entityType: record.mediaId ? 'Media' : 'Series',
					entityId: record.mediaId ?? record.seriesId ?? '',
					candidateCount: candidates.length,
					topConfidence: topCandidate?.confidence ?? null,
					addedAt: record.addedAt,
					record,
				}
			}),
		[records],
	)

	const columns = useMemo(
		() =>
			createColumns(t, [
				columnHelper.display({
					cell: ({ row }) => <ReviewButton records={records} startIndex={row.index} />,
					id: 'actions',
					size: 28,
				}),
			]),
		[t, records],
	)

	const { mutate: acceptAll, isPending: isAcceptingAll } = useGraphQLMutation(
		acceptAllPendingMatchesMutation,
		{
			onSuccess: () => {
				toast.success('All pending matches accepted')
				client.invalidateQueries({
					predicate: ({ queryKey }) =>
						queryKey.some((key) => typeof key === 'string' && key === 'pendingMetadataMatches'),
				})
			},
			onError: (error) =>
				toast.error(t(getKey('acceptAll.failed')), {
					description: error instanceof Error ? error.message : undefined,
				}),
		},
	)

	const { mutate: rejectAll, isPending: isRejectingAll } = useGraphQLMutation(
		rejectAllPendingMatchesMutation,
		{
			onSuccess: () => {
				toast.success(t(getKey('rejectAll.success')))
				client.invalidateQueries({
					predicate: ({ queryKey }) =>
						queryKey.some((key) => typeof key === 'string' && key === 'pendingMetadataMatches'),
				})
			},
			onError: (error) =>
				toast.error(t(getKey('rejectAll.failed')), {
					description: error instanceof Error ? error.message : undefined,
				}),
		},
	)

	const handleReviewAll = useCallback(() => {
		if (records.length > 0) {
			open(records, 0)
		}
	}, [records, open])

	if (rows.length === 0) {
		return (
			<div className="p-8 flex flex-col items-center justify-center rounded-lg border border-dashed border-border">
				<Text size="sm" variant="muted">
					{t(getKey('nothingToReview'))}
				</Text>
			</div>
		)
	}

	return (
		<div className="gap-4 flex flex-col">
			<div className="gap-2 flex items-center">
				<Button
					variant="secondary"
					size="sm"
					disabled={isAcceptingAll}
					onClick={() => acceptAll({})}
				>
					{t(getKey('acceptAll.label'))}
				</Button>
				<Button
					variant="destructive"
					size="sm"
					disabled={isRejectingAll}
					onClick={() => rejectAll(undefined as never)}
				>
					{t(getKey('rejectAll.label'))}
				</Button>

				<div className="flex-1" />

				<Button size="sm" onClick={handleReviewAll}>
					{t(getKey('startReview'))}
				</Button>
			</div>

			<Card>
				{/* FIXME: Client-side pagination currently broken */}
				<Table
					sortable
					columns={columns}
					options={{
						onPaginationChange: setPagination,
						pageCount: Math.ceil(rows.length / pagination.pageSize),
						state: {
							columnPinning: {
								right: ['actions'],
							},
							pagination,
						},
						getPaginationRowModel: getPaginationRowModel(),
						manualPagination: false,
					}}
					data={rows}
					fullWidth
					cellClassName="bg-background"
				/>
			</Card>
		</div>
	)
}

const LOCALE_KEY = 'metadataMatching.matchesTable'
const getKey = (key: string) => `${LOCALE_KEY}.${key}`

const createColumns = (
	translate: (key: string) => string,
	dynamicColumns: ColumnDef<PendingMatchRow>[],
) =>
	[
		columnHelper.accessor('entityName', {
			cell: ({ getValue }) => <Text size="sm">{getValue()}</Text>,
			header: translate(getKey('columns.entityName')),
			size: 300,
		}),
		columnHelper.accessor('entityType', {
			cell: ({ getValue }) => <Badge size="xs">{getValue()}</Badge>,
			header: translate(getKey('columns.entityType')),
			size: 80,
		}),
		columnHelper.accessor('candidateCount', {
			cell: ({ getValue }) => {
				const count = getValue()
				return (
					<Badge variant={count > 0 ? 'primary' : 'warning'} size="xs">
						{count}
					</Badge>
				)
			},
			header: translate(getKey('columns.candidateCount')),
			size: 100,
		}),
		columnHelper.accessor('topConfidence', {
			cell: ({ getValue }) => {
				const confidence = getValue()
				if (confidence == null)
					return (
						<Text size="sm" variant="muted">
							—
						</Text>
					)
				return <ConfidenceBadge confidence={confidence} />
			},
			header: translate(getKey('columns.topConfidence')),
			size: 120,
		}),
		columnHelper.accessor('addedAt', {
			cell: ({ getValue }) => (
				<Text size="sm" variant="muted">
					{new Date(getValue()).toLocaleDateString()}
				</Text>
			),
			header: translate(getKey('columns.addedAt')),
			size: 150,
		}),
		...dynamicColumns,
	] as ColumnDef<PendingMatchRow>[]
