import { Link, Text } from '@stump/components'
import { Media } from '@stump/graphql'
import { ColumnSort } from '@stump/sdk'
import { ColumnDef, createColumnHelper } from '@tanstack/react-table'
import dayjs from 'dayjs'

import paths from '@/paths'

import BookLinksCell from './BookLinksCell'
import CoverImageCell from './CoverImageCell'

const columnHelper = createColumnHelper<Media>()

const coverColumn = columnHelper.display({
	cell: ({ row: { original: book } }) => <CoverImageCell id={book.id} title={book.resolvedName} />,
	enableGlobalFilter: true,
	header: () => (
		<Text size="sm" variant="muted">
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
			to={paths.bookOverview(id)}
			className="line-clamp-2 text-sm text-opacity-100 no-underline hover:text-opacity-90"
		>
			{getValue()}
		</Link>
	),
	enableGlobalFilter: true,
	enableSorting: true,
	header: () => (
		<Text size="sm" variant="muted">
			Name
		</Text>
	),
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
	header: () => (
		<Text size="sm" variant="muted">
			Pages
		</Text>
	),
	id: 'pages',
	size: 60,
})

const publishedColumn = columnHelper.accessor(
	({ metadata }) => {
		const { year, month, day } = metadata || {}

		// TODO: validation
		if (!!year && !!month && !!day) {
			return dayjs(`${year}-${month}-${day}`).format('YYYY-MM-DD')
		} else if (!!year && !!month) {
			return dayjs(`${year}-${month}`).format('YYYY-MM')
		} else if (year) {
			return dayjs(`${year}`).format('YYYY')
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
			<Text size="sm" variant="muted">
				Published
			</Text>
		),
		id: 'published',
	},
)

const addedColumn = columnHelper.accessor(
	({ createdAt }) => dayjs(createdAt).format('M/D/YYYY, HH:mm:ss'),
	{
		cell: ({ getValue }) => (
			<Text size="sm" variant="muted">
				{getValue()}
			</Text>
		),
		enableGlobalFilter: true,
		enableSorting: true,
		header: () => (
			<Text size="sm" variant="muted">
				Added
			</Text>
		),
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
		<Text size="sm" variant="muted">
			Publisher
		</Text>
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
		<Text size="sm" variant="muted">
			Age Rating
		</Text>
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
	header: () => (
		<Text size="sm" variant="muted">
			Genres
		</Text>
	),
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
	header: () => (
		<Text size="sm" variant="muted">
			Volume
		</Text>
	),
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
	header: () => (
		<Text size="sm" variant="muted">
			Inkers
		</Text>
	),
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
	header: () => (
		<Text size="sm" variant="muted">
			Writers
		</Text>
	),
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
		<Text size="sm" variant="muted">
			Pencillers
		</Text>
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
		<Text size="sm" variant="muted">
			Colorists
		</Text>
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
		<Text size="sm" variant="muted">
			Letterers
		</Text>
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
	header: () => (
		<Text size="sm" variant="muted">
			Artists
		</Text>
	),
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
		<Text size="sm" variant="muted">
			Characters
		</Text>
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
	header: () => (
		<Text size="sm" variant="muted">
			Links
		</Text>
	),
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

// TODO: localization keys instead of hardcoded strings
export const columnOptionMap: Record<keyof typeof columnMap, string> = {
	added: 'Added',
	age_rating: 'Age Rating',
	artists: 'Artists',
	characters: 'Characters',
	colorists: 'Colorists',
	cover: 'Cover',
	genres: 'Genres',
	inkers: 'Inkers',
	letterers: 'Letterers',
	links: 'Links',
	name: 'Name',
	pages: 'Pages',
	pencillers: 'Pencillers',
	published: 'Published',
	publisher: 'Publisher',
	volume: 'Volume',
	writers: 'Writers',
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
