import { useSDK, useSuspenseGraphQL } from '@stump/client'
import { Heading, Text } from '@stump/components'
import {
	BookOverviewHeaderQuery,
	graphql,
	MediaFilterInput,
	MediaMetadataFilterInput,
} from '@stump/graphql'

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
			extension
			pages
			metadata {
				ageRating
				genres
				publisher
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
	search?: MediaFilterInput
}

function build_metadata_table(media: BookOverviewHeaderQuery['mediaById']): MetadataTableItem[] {
	const table: MetadataTableItem[] = []
	const metadata = media?.metadata

	if (!metadata) {
		return table
	}

	const add_to_table = (
		keynameBase: string,
		prefix: string,
		values: string[],
		search?: MediaMetadataFilterInput,
	) => {
		if (values && values.length > 0) {
			// if all values are empty, don't add the key
			if (values.every((v) => !v)) {
				return
			}

			const searchMedia = search ? { metadata: search } : search

			table.push({
				keynameBase: keynameBase,
				prefix: prefix,
				values: values,
				search: searchMedia,
			})
		}
	}

	const age_rating_num = metadata.ageRating ?? 0
	const year_num = metadata.year ?? 0
	const is_epub = media?.extension === 'epub'
	const pages = media?.pages ?? 0

	const publishers = [metadata.publisher ?? '']
	const writers = metadata.writers?.filter((w) => !!w) ?? []
	const genres = metadata.genres?.filter((g) => !!g) ?? []
	const age_rating = age_rating_num > 0 ? [age_rating_num.toString()] : []
	const year = year_num > 0 ? [year_num.toString()] : []

	if (is_epub) {
		add_to_table('writers', 'By ', writers, {
			writers: { likeAnyOf: metadata?.writers || '' },
		})
	}

	add_to_table('publisher', 'Publisher: ', publishers, {
		publisher: { contains: metadata?.publisher || '' },
	})
	add_to_table('genres', 'Genres: ', genres, {
		genres: { likeAnyOf: metadata?.genres || '' },
	})
	add_to_table('age_rating', 'Age Rating: ', age_rating)
	add_to_table('year_published', 'Year: ', year, { year: { eq: year_num } })

	if (pages > 0) {
		add_to_table('pages', 'Pages: ', [pages.toString()])
	}

	return table
}

export default function BookOverviewSceneHeader({ id }: Props) {
	const { sdk } = useSDK()
	const {
		data: { mediaById: media },
	} = useSuspenseGraphQL(query, sdk.cacheKey('bookOverviewHeader', [id]), {
		id: id || '',
	})

	if (!media) {
		throw new Error('Book not found')
	}

	const metadata_table = build_metadata_table(media)

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
									<SearchLinkBadge search={metadata_row.search} text={element} />
								</div>
							))}
						</div>
					))}
				</div>
			)}

			{media.seriesId && <BookLibrarySeriesLinks seriesId={media.seriesId} />}

			<TagList tags={media.tags || null} baseUrl={paths.bookSearch()} />
		</div>
	)
}
