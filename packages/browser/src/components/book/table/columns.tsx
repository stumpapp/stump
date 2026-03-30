import { Badge, Link, Text } from '@stump/components'
import { FragmentType, Media, MediaModelOrdering } from '@stump/graphql'
import { ColumnSort } from '@stump/sdk'
import { ColumnDef, createColumnHelper } from '@tanstack/react-table'
import { format, intlFormat } from 'date-fns'

import paths from '@/paths'
import { formatBytes } from '@/utils/format'

import { BookCardFragment } from '../BookCard'
import BookLinksCell from './BookLinksCell'
import CoverImageCell from './CoverImageCell'

const columnHelper = createColumnHelper<Media>()
const MAX_LIST_BADGES = 8

function MetadataBadgeListCell({ values }: { values?: string[] | null }) {
	if (!values?.length) {
		return null
	}

	const visible = values.slice(0, MAX_LIST_BADGES)
	const remaining = Math.max(values.length - visible.length, 0)

	return (
		<div className="flex max-h-[3.125rem] flex-wrap gap-1 overflow-hidden">
			{visible.map((value) => (
				<Badge key={value} size="sm" className="line-clamp-1 max-w-full">
					{value}
				</Badge>
			))}
			{remaining > 0 && (
				<Badge size="sm" variant="secondary">
					+{remaining}
				</Badge>
			)}
		</div>
	)
}

const coverColumn = columnHelper.display({
	cell: ({ row: { original: book } }) => <CoverImageCell id={book.id} title={book.resolvedName} />,
	enableGlobalFilter: true,
	header: () => null,
	id: 'cover',
	size: 40,
})

const nameColumn = columnHelper.accessor(({ resolvedName }) => resolvedName, {
	cell: ({
		getValue,
		row: {
			original: { id, libraryConfig, readProgress },
		},
	}) => (
		<Link
			to={
				libraryConfig?.skipBookOverview
					? paths.bookReader(id, {
							epubcfi: readProgress?.epubcfi,
							page: readProgress?.page ?? undefined,
						})
					: paths.bookOverview(id)
			}
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
	id: MediaModelOrdering.Name, // TODO (graphql): should this be resovledName?, sorting by `name` is different from sorting by `resolvedName`
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
		<Text size="sm" variant="secondary">
			Pages
		</Text>
	),
	id: MediaModelOrdering.Pages,
	size: 60,
})

const fileSizeColumn = columnHelper.accessor('size', {
	cell: ({ getValue }) => (
		<Text size="sm" variant="muted">
			{formatBytes(getValue())}
		</Text>
	),
	enableGlobalFilter: true,
	enableSorting: true,
	header: () => (
		<Text size="sm" variant="secondary">
			File Size
		</Text>
	),
	id: MediaModelOrdering.Size,
	size: 100,
})

const extensionColumn = columnHelper.accessor('extension', {
	cell: ({ getValue }) => (
		<Text size="sm" variant="muted">
			{getValue()}
		</Text>
	),
	enableGlobalFilter: true,
	enableSorting: true,
	header: () => (
		<Text size="sm" variant="secondary">
			Extension
		</Text>
	),
	id: MediaModelOrdering.Extension,
	size: 90,
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
		// TODO(relation-ordering): Support order by relation
		enableSorting: false,
		header: () => (
			<Text size="sm" variant="secondary">
				Published
			</Text>
		),
		id: 'published',
	},
)

const addedColumn = columnHelper.accessor(
	({ createdAt }) =>
		intlFormat(new Date(createdAt), {
			year: 'numeric',
			month: 'numeric',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit',
		}),
	{
		cell: ({ getValue }) => (
			<Text size="sm" variant="muted">
				{getValue()}
			</Text>
		),
		enableGlobalFilter: true,
		enableSorting: true,
		header: () => (
			<Text size="sm" variant="secondary">
				Added
			</Text>
		),
		id: MediaModelOrdering.CreatedAt,
	},
)

const publisherColumn = columnHelper.accessor(({ metadata }) => metadata?.publisher, {
	cell: ({ getValue }) => (
		<Text size="sm" variant="muted">
			{getValue()}
		</Text>
	),
	enableGlobalFilter: true,
	// TODO(relation-ordering): Support order by relation
	enableSorting: false,
	header: () => (
		<Text size="sm" variant="secondary">
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
	// TODO(relation-ordering): Support order by relation
	enableSorting: false,
	header: () => (
		<Text size="sm" variant="secondary">
			Age Rating
		</Text>
	),
	id: 'age_rating',
})

const genresColumn = columnHelper.accessor(({ metadata }) => metadata?.genres, {
	cell: ({ getValue }) => <MetadataBadgeListCell values={getValue()} />,
	enableGlobalFilter: true,
	// TODO(relation-ordering): Support order by relation
	enableSorting: false,
	header: () => (
		<Text size="sm" variant="secondary">
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
	// TODO(relation-ordering): Support order by relation
	enableSorting: false,
	header: () => (
		<Text size="sm" variant="secondary">
			Volume
		</Text>
	),
	id: 'volume',
})

const inkersColumn = columnHelper.accessor(({ metadata }) => metadata?.inkers, {
	cell: ({ getValue }) => <MetadataBadgeListCell values={getValue()} />,
	enableGlobalFilter: true,
	// TODO(relation-ordering): Support order by relation
	enableSorting: false,
	header: () => (
		<Text size="sm" variant="secondary">
			Inkers
		</Text>
	),
	id: 'inkers',
})

const writersColumn = columnHelper.accessor(({ metadata }) => metadata?.writers, {
	cell: ({ getValue }) => <MetadataBadgeListCell values={getValue()} />,
	enableGlobalFilter: true,
	// TODO(relation-ordering): Support order by relation
	enableSorting: false,
	header: () => (
		<Text size="sm" variant="secondary">
			Writers
		</Text>
	),
	id: 'writers',
})

const pencillersColumn = columnHelper.accessor(({ metadata }) => metadata?.pencillers, {
	cell: ({ getValue }) => <MetadataBadgeListCell values={getValue()} />,
	enableGlobalFilter: true,
	// TODO(relation-ordering): Support order by relation
	enableSorting: false,
	header: () => (
		<Text size="sm" variant="secondary">
			Pencillers
		</Text>
	),
	id: 'pencillers',
})

const coloristsColumn = columnHelper.accessor(({ metadata }) => metadata?.colorists, {
	cell: ({ getValue }) => <MetadataBadgeListCell values={getValue()} />,
	enableGlobalFilter: true,
	// TODO(relation-ordering): Support order by relation
	enableSorting: false,
	header: () => (
		<Text size="sm" variant="secondary">
			Colorists
		</Text>
	),
	id: 'colorists',
})

const letterersColumn = columnHelper.accessor(({ metadata }) => metadata?.letterers, {
	cell: ({ getValue }) => <MetadataBadgeListCell values={getValue()} />,

	enableGlobalFilter: true,
	// TODO(relation-ordering): Support order by relation
	enableSorting: false,
	header: () => (
		<Text size="sm" variant="secondary">
			Letterers
		</Text>
	),
	id: 'letterers',
})

const artistsColumn = columnHelper.accessor(({ metadata }) => metadata?.coverArtists, {
	cell: ({ getValue }) => <MetadataBadgeListCell values={getValue()} />,

	enableGlobalFilter: true,
	// TODO(relation-ordering): Support order by relation
	enableSorting: false,
	header: () => (
		<Text size="sm" variant="secondary">
			Artists
		</Text>
	),
	id: 'artists',
})

const charactersColumn = columnHelper.accessor(({ metadata }) => metadata?.characters, {
	cell: ({ getValue }) => <MetadataBadgeListCell values={getValue()} />,

	enableGlobalFilter: true,
	// TODO(relation-ordering): Support order by relation
	enableSorting: false,
	header: () => (
		<Text size="sm" variant="secondary">
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
	// TODO(relation-ordering): Support order by relation
	enableSorting: false,
	header: () => (
		<Text size="sm" variant="secondary">
			Links
		</Text>
	),
	id: 'links',
})

const positionColumn = columnHelper.accessor(
	({ metadata, seriesPosition }) => seriesPosition ?? Number(metadata?.number),
	{
		cell: ({ getValue }) => {
			const value = getValue()
			if (value == null || isNaN(value)) return null

			return (
				<Text size="sm" variant="muted" className="text-right">
					{value}
				</Text>
			)
		},
		enableGlobalFilter: true,
		// TODO(relation-ordering): Support order by relation
		enableSorting: false,
		header: () => (
			<Text size="sm" variant="muted" className="w-full text-center">
				#
			</Text>
		),
		id: 'position',
		size: 0,
	},
)

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
	extension: extensionColumn,
	file_size: fileSizeColumn,
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
	position: positionColumn,
} as Record<string, ColumnDef<Media>>

// TODO: localization keys instead of hardcoded strings
export const columnOptionMap: Record<keyof typeof columnMap, string> = {
	added: 'Added',
	age_rating: 'Age Rating',
	artists: 'Artists',
	characters: 'Characters',
	colorists: 'Colorists',
	cover: 'Cover',
	extension: 'Extension',
	file_size: 'File Size',
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
	position: 'Position',
}

export const defaultColumns = [
	coverColumn,
	nameColumn,
	pagesColumn,
	publishedColumn,
	addedColumn,
] as ColumnDef<FragmentType<typeof BookCardFragment>>[]

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
		.filter(Boolean) as ColumnDef<FragmentType<typeof BookCardFragment>>[]
}
