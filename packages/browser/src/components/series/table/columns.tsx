import { Link, Text } from '@stump/components'
import { ReactTableColumnSort, Series } from '@stump/sdk'
import { ColumnDef, createColumnHelper } from '@tanstack/react-table'

import paths from '@/paths'

import CoverImageCell from './CoverImageCell'

const columnHelper = createColumnHelper<Series>()

const coverColumn = columnHelper.display({
	cell: ({
		row: {
			original: { id, name, metadata },
		},
	}) => <CoverImageCell id={id} title={metadata?.title || name} />,
	enableGlobalFilter: true,
	header: () => (
		<Text size="sm" variant="secondary">
			Cover
		</Text>
	),
	id: 'cover',
	size: 60,
})

const nameColumn = columnHelper.accessor(({ name, metadata }) => metadata?.title || name, {
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
	id: 'name',
	minSize: 285,
})

const booksCountColumn = columnHelper.accessor((series) => series.media_count?.toString(), {
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
} as Record<string, ColumnDef<Series>>

export const defaultColumns = [coverColumn, nameColumn, booksCountColumn] as ColumnDef<Series>[]

/**
 * A helper function to build the columns for the table based on the stored column selection. If
 * no columns are selected, or if the selection is empty, the default columns will be used.
 */
export const buildColumns = (columns?: ReactTableColumnSort[]) => {
	if (!columns || columns.length === 0) {
		return defaultColumns
	}

	const sortedColumns = columns.sort((a, b) => a.position - b.position)
	const selectedColumnIds = sortedColumns.map(({ id }) => id)

	return selectedColumnIds
		.map((id) => columnMap[id as keyof typeof columnMap])
		.filter(Boolean) as ColumnDef<Series>[]
}
