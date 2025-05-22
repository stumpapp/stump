import { useSuspenseGraphQL } from '@stump/client'
import { Heading, Text } from '@stump/components'
import { BookOverviewHeaderQuery, graphql } from '@stump/graphql'

import SearchLinkBadge from '@/components/SearchLinkBadge'
import TagList from '@/components/tags/TagList'

import paths from '../../paths'
import BookLibrarySeriesLinks from './BookLibrarySeriesLinks'

export const query = graphql(`
	query BookOverviewHeader($id: ID!) {
		mediaById(id: $id) {
			id
			resolvedName
			seriesId
			metadata {
				ageRating
				characters
				colorists
				coverArtists
				editors
				genres
				inkers
				letterers
				links
				pencillers
				publisher
				teams
				writers
				year
			}
			tags {
				id
				name
			}
		}
	}
`)

type Props = {
	id: string
}

interface MetadataTableItem {
	keynameBase: string
	prefix: string
	values: string[]
	searchKey: string
}

function build_metadata_table(
	metadata: NonNullable<BookOverviewHeaderQuery['mediaById']>['metadata'] | null,
): MetadataTableItem[] {
	const table: MetadataTableItem[] = []

	if (!metadata) {
		return table
	}

	const add_to_table = (
		keynameBase: string,
		prefix: string,
		values: string[],
		searchKey: string,
	) => {
		if (values && values.length > 0) {
			// if all values are empty, don't add the key
			if (values.every((v) => !v)) {
				return
			}

			table.push({
				keynameBase: keynameBase,
				prefix: prefix,
				values: values,
				searchKey: searchKey,
			})
		}
	}

	const age_rating_num = metadata.ageRating ?? 0
	const year_num = metadata.year ?? 0

	const publishers = [metadata.publisher ?? '']
	const characters = metadata.characters?.filter((c) => !!c) ?? []
	const colorists = metadata.colorists?.filter((c) => !!c) ?? []
	const writers = metadata.writers?.filter((w) => !!w) ?? []
	const pencillers = metadata.pencillers?.filter((p) => !!p) ?? []
	const inkers = metadata.inkers?.filter((i) => !!i) ?? []
	const letterers = metadata.letterers?.filter((l) => !!l) ?? []
	const editors = metadata.editors?.filter((e) => !!e) ?? []
	const genres = metadata.genres?.filter((g) => !!g) ?? []
	const age_rating = age_rating_num > 0 ? [age_rating_num.toString()] : []
	const year = year_num > 0 ? [year_num.toString()] : []

	add_to_table('writers', 'By ', writers, 'metadata[writer]')
	add_to_table('publisher', 'Publisher: ', publishers, 'metadata[publisher]')
	add_to_table('genres', 'Genres: ', genres, 'metadata[genre]')
	add_to_table('characters', 'Characters: ', characters, 'metadata[character]')
	add_to_table('colorists', 'Colorists: ', colorists, 'metadata[colorist]')
	add_to_table('pencillers', 'Pencillers: ', pencillers, 'metadata[penciller]')
	add_to_table('inkers', 'Inkers: ', inkers, 'metadata[inker]')
	add_to_table('letters', 'Letterers: ', letterers, 'metadata[letterer]')
	add_to_table('editors', 'Editors: ', editors, 'metadata[editor]')
	add_to_table('age_rating', 'Age Rating: ', age_rating, 'metadata[age_rating]')
	add_to_table('year_published', 'Year: ', year, 'metadata[year]')

	return table
}

export default function BookOverviewSceneHeader({ id }: Props) {
	const {
		data: { mediaById: media },
	} = useSuspenseGraphQL(query, ['bookOverviewHeader', id], {
		id: id || '',
	})

	if (!media) {
		throw new Error('Book not found')
	}

	const metadata_table = build_metadata_table(media.metadata)

	return (
		<div className="flex flex-col items-center text-center tablet:items-start tablet:text-left">
			{<Heading size="sm">{media.resolvedName}</Heading>}

			{!!metadata_table.length && (
				<div>
					{metadata_table.map((metadata_row) => (
						<div key={metadata_row.keynameBase} className="flex flex-row gap-1 space-x-2">
							<Text>{metadata_row.prefix}</Text>
							{metadata_row.values.map((element, index) => (
								<div key={metadata_row.keynameBase + index}>
									<SearchLinkBadge searchKey={metadata_row.searchKey} text={element} />
								</div>
							))}
						</div>
					))}
				</div>
			)}

			{media.seriesId && <BookLibrarySeriesLinks series_id={media.seriesId} />}

			<TagList tags={media.tags || null} baseUrl={paths.bookSearch()} />
		</div>
	)
}
