import { Link, Text } from '@stump/components'
import { SeriesModelOrdering } from '@stump/graphql'
import { ColumnSort } from '@stump/sdk'
import { ColumnDef, createColumnHelper } from '@tanstack/react-table'

import paths from '@/paths'

import { SeriesCardData } from '../SeriesCard'
import CoverImageCell from './CoverImageCell'

const columnHelper = createColumnHelper<SeriesCardData>()

const coverColumn = columnHelper.display({
	cell: ({
		row: {
			original: { id, resolvedName },
		},
	}) => <CoverImageCell id={id} title={resolvedName} />,
	enableGlobalFilter: true,
	header: () => (
		<Text size="sm" variant="secondary">
			Cover
		</Text>
	),
	id: 'cover',
	size: 60,
})

const nameColumn = columnHelper.accessor(({ resolvedName }) => resolvedName, {
	cell: ({
		getValue,
		row: {
			original: { id },
		},
	}) => (
		<Link
			to={paths.seriesOverview(id)}
			className="line-clamp-2 text-sm text-opacity-100 no-underline hover:text-opacity-90"
		>
			{getValue()}
		</Link>
	),
	enableGlobalFilter: true,
	enableSorting: true,
	header: () => (
		<Text size="sm" variant="secondary">
			Name
		</Text>
	),
	id: SeriesModelOrdering.Name,
	minSize: 285,
})

const booksCountColumn = columnHelper.accessor((series) => series.mediaCount?.toString(), {
	cell: ({ getValue }) => (
		<Text size="sm" variant="muted">
			{getValue()}
		</Text>
	),
	enableGlobalFilter: true,
	// TODO(prisma 0.7.0): Support order by relation
	enableSorting: false,
	header: () => (
		<Text size="sm" variant="secondary">
			Books
		</Text>
	),
	id: 'media_count',
	minSize: 60,
})

// TODO: more columns

/**
 * A map of all columns that can be selected for the table. The key is the column ID, and the value is the column, itself.
 */
export const columnMap = {
	books: booksCountColumn,
	cover: coverColumn,
	name: nameColumn,
} as Record<string, ColumnDef<SeriesCardData>>

export const defaultColumns = [
	coverColumn,
	nameColumn,
	booksCountColumn,
] as ColumnDef<SeriesCardData>[]

export const defaultColumnSort: ColumnSort[] = defaultColumns.map((column, idx) => ({
	id: column.id || '',
	position: idx,
}))

/**
 * A helper function to build the columns for the table based on the stored column selection. If
 * no columns are selected, or if the selection is empty, the default columns will be used.
 */
export const buildColumns = (columns?: ColumnSort[]) => {
	if (!columns || columns.length === 0) {
		return defaultColumns
	}

	const sortedColumns = columns.sort((a, b) => a.position - b.position)
	const selectedColumnIds = sortedColumns.map(({ id }) => id)

	return selectedColumnIds
		.map((id) => columnMap[id as keyof typeof columnMap])
		.filter(Boolean) as ColumnDef<SeriesCardData>[]
}
