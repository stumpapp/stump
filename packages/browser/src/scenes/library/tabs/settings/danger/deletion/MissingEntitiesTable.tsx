import { useGraphQL } from '@stump/client'
import { Badge, Card, Heading, Link, Text } from '@stump/components'
import { graphql, LogModelOrdering, MissingEntity, MissingEntityType } from '@stump/graphql'
import { useLocaleContext } from '@stump/i18n'
import { keepPreviousData } from '@tanstack/react-query'
import { createColumnHelper, SortingState } from '@tanstack/react-table'
import { CircleSlash2 } from 'lucide-react'
import { useState } from 'react'
import { match } from 'ts-pattern'

import { Table } from '@/components/table'
import { usePaths } from '@/paths'

import { useLibraryManagement } from '../../context'

const query = graphql(`
	query LibraryMissingEntities($libraryId: ID!, $pagination: Pagination!) {
		libraryMissingEntities(libraryId: $libraryId, pagination: $pagination) {
			nodes {
				id
				path
				type
			}
			pageInfo {
				__typename
				... on OffsetPaginationInfo {
					totalPages
					currentPage
					pageSize
					pageOffset
					pageOffset
					zeroBased
					totalItems
				}
			}
		}
	}
`)

export default function MisisngEntitiesTable() {
	const { t } = useLocaleContext()
	const {
		library: { id },
	} = useLibraryManagement()

	const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 })
	const [sortState, setSortState] = useState<SortingState>([])

	const { data, isLoading } = useGraphQL(
		query,
		['missingEntities', id, pagination],
		{
			libraryId: id,
			pagination: {
				offset: {
					page: pagination.pageIndex + 1, // Offset is 1-based
					pageSize: pagination.pageSize,
				},
			},
		},
		{
			placeholderData: keepPreviousData,
		},
	)

	const paths = usePaths()

	const missingEntities = data?.libraryMissingEntities.nodes ?? []
	const pageInfo = data?.libraryMissingEntities.pageInfo

	if (!!pageInfo && pageInfo.__typename !== 'OffsetPaginationInfo') {
		throw new Error('Invalid pagination type, expected OffsetPaginationInfo')
	}

	const columns = [
		columnHelper.accessor('path', {
			cell: ({
				row: {
					original: { id, path, type },
				},
			}) => (
				<Link
					to={match(type)
						.with(MissingEntityType.Book, () => paths.bookOverview(id))
						.with(MissingEntityType.Series, () => paths.seriesOverview(id))
						.otherwise(() => undefined)}
					className="line-clamp-2 text-sm text-opacity-100 no-underline hover:text-opacity-90 hover:underline"
				>
					{path}
				</Link>
			),
			header: t(getKey('columns.path')),
			size: 500,
		}),
		columnHelper.accessor('type', {
			id: LogModelOrdering.Message,
			cell: ({
				row: {
					original: { type },
				},
			}) => <Badge size="sm">{t(getKey(`types.${type}`))}</Badge>,
			header: t(getKey('columns.type')),
		}),
	]

	return (
		<Card>
			<Table
				sortable
				columns={columns}
				options={{
					manualPagination: true,
					manualSorting: true,
					onPaginationChange: setPagination,
					onSortingChange: setSortState,
					pageCount: pageInfo?.totalPages,
					state: {
						pagination,
						sorting: sortState,
					},
				}}
				data={missingEntities}
				fullWidth
				totalCount={pageInfo?.totalItems}
				emptyRenderer={() =>
					isLoading ? null : (
						<div className="flex min-h-[150px] flex-col items-center justify-center gap-2">
							<CircleSlash2 className="h-10 w-10 pb-2 pt-1 text-foreground-muted" />
							<Heading size="sm">{t(`${LOCALE_BASE}.emptyHeading`)}</Heading>
							<Text size="sm" variant="muted">
								{t(`${LOCALE_BASE}.emptySubtitle`)}
							</Text>
						</div>
					)
				}
				isZeroBasedPagination
			/>
		</Card>
	)
}

const LOCALE_BASE =
	'librarySettingsScene.danger-zone/delete.sections.cleanLibrary.missingEntitiesTable'
const getKey = (key: string) => `${LOCALE_BASE}.${key}`

const columnHelper = createColumnHelper<MissingEntity>()
