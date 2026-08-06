import { Link, Text } from '@stump/components'
import { Media } from '@stump/graphql'
import { ColumnSort } from '@stump/sdk'
import { ColumnDef, createColumnHelper } from '@tanstack/react-table'
import { format, intlFormat, isValid } from 'date-fns'

import paths from '@/paths'
import TableColumnHeader from '@/components/table/TableColumnHeader'

import BookLinksCell from './BookLinksCell'
import CoverImageCell from './CoverImageCell'

const columnHelper = createColumnHelper<Media>()

const coverColumn = columnHelper.display({
	cell: ({ row: { original: book } }) => <CoverImageCell id={book.id} title={book.resolvedName} />,
	enableGlobalFilter: true,
	header: () => <TableColumnHeader translationKey="tableColumns.labels.cover" variant="muted" />,
	id: 'cover',
	size: 80,
})

const nameColumn = columnHelper.accessor(({ resolvedName }) => resolvedName, {
	cell: ({
		getValue,
		row: {
			original: { id },
		},
	}) => (
		<Link
			to={paths.bookOverview(id)}
			className="text-sm line-clamp-2 no-underline hover:opacity-90"
		>
			{getValue()}
		</Link>
	),
	enableGlobalFilter: true,
	enableSorting: true,
	header: () => <TableColumnHeader translationKey="tableColumns.labels.name" variant="muted" />,
	id: 'name',
	minSize: 285,
})

const pagesColumn = columnHelper.accessor('pages', {
	cell: ({ getValue }) => (
		<Text size="sm" variant="muted">
			{getValue()}
		</Text>
	),
	enableGlobalFilter: true,
	enableSorting: true,
	header: () => <TableColumnHeader translationKey="tableColumns.labels.pages" variant="muted" />,
	id: 'pages',
	size: 100,
})

const publishedColumn = columnHelper.accessor(
	({ metadata }) => {
		const { year, month, day } = metadata || {}

		// TODO: validation
		if (!!year && !!month && !!day) {
			return format(new Date(year, month - 1, day), 'yyyy-MM-dd')
		} else if (!!year && !!month) {
			return format(new Date(year, month - 1), 'yyyy-MM')
		} else if (year) {
			return String(year)
		}

		return ''
	},
	{
		cell: ({ getValue }) => (
			<Text size="sm" variant="muted">
				{getValue()}
			</Text>
		),
		enableGlobalFilter: true,
		enableSorting: true,
		header: () => (
			<TableColumnHeader translationKey="tableColumns.labels.published" variant="muted" />
		),
		id: 'published',
	},
)

const addedColumn = columnHelper.accessor(
	({ createdAt }) => {
		const date = new Date(createdAt)
		if (!isValid(date)) return ''
		return intlFormat(date, {
			year: 'numeric',
			month: 'numeric',
			day: 'numeric',
		})
	},
	{
		cell: ({ getValue }) => (
			<Text size="sm" variant="muted">
				{getValue()}
			</Text>
		),
		enableGlobalFilter: true,
		enableSorting: true,
		header: () => <TableColumnHeader translationKey="tableColumns.labels.added" variant="muted" />,
		id: 'added',
	},
)

const publisherColumn = columnHelper.accessor(({ metadata }) => metadata?.publisher, {
	cell: ({ getValue }) => (
		<Text size="sm" variant="muted">
			{getValue()}
		</Text>
	),
	enableGlobalFilter: true,
	enableSorting: true,
	header: () => (
		<TableColumnHeader translationKey="tableColumns.labels.publisher" variant="muted" />
	),
	id: 'publisher',
})

const ageRatingColumn = columnHelper.accessor(({ metadata }) => metadata?.ageRating, {
	cell: ({ getValue }) => (
		<Text size="sm" variant="muted">
			{getValue()}
		</Text>
	),
	enableGlobalFilter: true,
	enableSorting: true,
	header: () => (
		<TableColumnHeader translationKey="tableColumns.labels.age_rating" variant="muted" />
	),
	id: 'age_rating',
})

const genresColumn = columnHelper.accessor(({ metadata }) => metadata?.genres?.join(', '), {
	cell: ({ getValue }) => (
		<Text size="sm" variant="muted">
			{getValue()}
		</Text>
	),
	enableGlobalFilter: true,
	enableSorting: true,
	header: () => <TableColumnHeader translationKey="tableColumns.labels.genres" variant="muted" />,
	id: 'genres',
})

const volumeColumn = columnHelper.accessor(({ metadata }) => metadata?.volume, {
	cell: ({ getValue }) => (
		<Text size="sm" variant="muted">
			{getValue()}
		</Text>
	),
	enableGlobalFilter: true,
	enableSorting: true,
	header: () => <TableColumnHeader translationKey="tableColumns.labels.volume" variant="muted" />,
	id: 'volume',
})

const inkersColumn = columnHelper.accessor(({ metadata }) => metadata?.inkers?.join(', '), {
	cell: ({ getValue }) => (
		<Text size="sm" variant="muted">
			{getValue()}
		</Text>
	),
	enableGlobalFilter: true,
	enableSorting: true,
	header: () => <TableColumnHeader translationKey="tableColumns.labels.inkers" variant="muted" />,
	id: 'inkers',
})

const writersColumn = columnHelper.accessor(({ metadata }) => metadata?.writers?.join(', '), {
	cell: ({ getValue }) => (
		<Text size="sm" variant="muted">
			{getValue()}
		</Text>
	),
	enableGlobalFilter: true,
	enableSorting: true,
	header: () => <TableColumnHeader translationKey="tableColumns.labels.writers" variant="muted" />,
	id: 'writers',
})

const pencillersColumn = columnHelper.accessor(({ metadata }) => metadata?.pencillers?.join(', '), {
	cell: ({ getValue }) => (
		<Text size="sm" variant="muted">
			{getValue()}
		</Text>
	),
	enableGlobalFilter: true,
	enableSorting: true,
	header: () => (
		<TableColumnHeader translationKey="tableColumns.labels.pencillers" variant="muted" />
	),
	id: 'pencillers',
})

const coloristsColumn = columnHelper.accessor(({ metadata }) => metadata?.colorists?.join(', '), {
	cell: ({ getValue }) => (
		<Text size="sm" variant="muted">
			{getValue()}
		</Text>
	),
	enableGlobalFilter: true,
	enableSorting: true,
	header: () => (
		<TableColumnHeader translationKey="tableColumns.labels.colorists" variant="muted" />
	),
	id: 'colorists',
})

const letterersColumn = columnHelper.accessor(({ metadata }) => metadata?.letterers?.join(', '), {
	cell: ({ getValue }) => (
		<Text size="sm" variant="muted">
			{getValue()}
		</Text>
	),

	enableGlobalFilter: true,
	enableSorting: true,
	header: () => (
		<TableColumnHeader translationKey="tableColumns.labels.letterers" variant="muted" />
	),
	id: 'letterers',
})

const artistsColumn = columnHelper.accessor(({ metadata }) => metadata?.coverArtists?.join(', '), {
	cell: ({ getValue }) => (
		<Text size="sm" variant="muted">
			{getValue()}
		</Text>
	),

	enableGlobalFilter: true,
	enableSorting: true,
	header: () => <TableColumnHeader translationKey="tableColumns.labels.artists" variant="muted" />,
	id: 'artists',
})

const charactersColumn = columnHelper.accessor(({ metadata }) => metadata?.characters?.join(', '), {
	cell: ({ getValue }) => (
		<Text size="sm" variant="muted">
			{getValue()}
		</Text>
	),

	enableGlobalFilter: true,
	enableSorting: true,
	header: () => (
		<TableColumnHeader translationKey="tableColumns.labels.characters" variant="muted" />
	),
	id: 'characters',
})

const linksColumn = columnHelper.accessor(({ metadata }) => metadata?.links?.join(', '), {
	cell: ({
		row: {
			original: { metadata },
		},
	}) => <BookLinksCell links={metadata?.links || []} />,

	enableGlobalFilter: true,
	enableSorting: true,
	header: () => <TableColumnHeader translationKey="tableColumns.labels.links" variant="muted" />,
	id: 'links',
})

export type MediaTableColumnDef = ColumnDef<Media>

/**
 * A map of all columns that can be selected for the table. The key is the column ID, and the value is the column, itself.
 */
export const columnMap = {
	added: addedColumn,
	age_rating: ageRatingColumn,
	artists: artistsColumn,
	characters: charactersColumn,
	colorists: coloristsColumn,
	cover: coverColumn,
	genres: genresColumn,
	inkers: inkersColumn,
	letterers: letterersColumn,
	links: linksColumn,
	name: nameColumn,
	pages: pagesColumn,
	pencillers: pencillersColumn,
	published: publishedColumn,
	publisher: publisherColumn,
	volume: volumeColumn,
	writers: writersColumn,
} as Record<string, ColumnDef<Media>>

export const columnOptionMap: Record<keyof typeof columnMap, string> = {
	added: 'tableColumns.labels.added',
	age_rating: 'tableColumns.labels.age_rating',
	artists: 'tableColumns.labels.artists',
	characters: 'tableColumns.labels.characters',
	colorists: 'tableColumns.labels.colorists',
	cover: 'tableColumns.labels.cover',
	genres: 'tableColumns.labels.genres',
	inkers: 'tableColumns.labels.inkers',
	letterers: 'tableColumns.labels.letterers',
	links: 'tableColumns.labels.links',
	name: 'tableColumns.labels.name',
	pages: 'tableColumns.labels.pages',
	pencillers: 'tableColumns.labels.pencillers',
	published: 'tableColumns.labels.published',
	publisher: 'tableColumns.labels.publisher',
	volume: 'tableColumns.labels.volume',
	writers: 'tableColumns.labels.writers',
}

export const defaultColumns = [
	coverColumn,
	nameColumn,
	pagesColumn,
	publishedColumn,
	addedColumn,
] as ColumnDef<Media>[]

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
		.filter(Boolean) as ColumnDef<Media>[]
}

// TODO: make not so scuffed/verbose lol
export const bookFuzzySearch = (book: Media, search: string): boolean => {
	const { resolvedName, metadata } = book

	if (resolvedName.toLowerCase().includes(search.toLowerCase())) {
		return true
	}

	if (metadata?.title?.toLowerCase().includes(search.toLowerCase())) {
		return true
	}

	if (metadata?.publisher?.toLowerCase().includes(search.toLowerCase())) {
		return true
	}

	if (metadata?.ageRating?.toString().includes(search.toLowerCase())) {
		return true
	}

	if (metadata?.genres?.join(', ').toLowerCase().includes(search.toLowerCase())) {
		return true
	}

	if (metadata?.volume?.toString().includes(search.toLowerCase())) {
		return true
	}

	if (metadata?.inkers?.join(', ').toLowerCase().includes(search.toLowerCase())) {
		return true
	}

	if (metadata?.writers?.join(', ').toLowerCase().includes(search.toLowerCase())) {
		return true
	}

	if (metadata?.pencillers?.join(', ').toLowerCase().includes(search.toLowerCase())) {
		return true
	}

	if (metadata?.colorists?.join(', ').toLowerCase().includes(search.toLowerCase())) {
		return true
	}

	if (metadata?.letterers?.join(', ').toLowerCase().includes(search.toLowerCase())) {
		return true
	}

	if (metadata?.coverArtists?.join(', ').toLowerCase().includes(search.toLowerCase())) {
		return true
	}

	if (metadata?.links?.join(', ').toLowerCase().includes(search.toLowerCase())) {
		return true
	}

	return false
}
