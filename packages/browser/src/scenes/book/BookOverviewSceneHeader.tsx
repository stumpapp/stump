import { Media, MediaMetadata } from '@stump/sdk'
import { formatBookName } from '@/utils/format'
import SearchLinkBadge from '@/components/SearchLinkBadge'
import BookLibrarySeriesLinks from './BookLibrarySeriesLinks'
import TagList from '@/components/tags/TagList'
import { Heading, Text } from '@stump/components'
import paths from '../../paths'

interface MetadataTableItem {
	keyname: string
	prefix: string
	values: string[]
	searchKey: string
}

export default class BookOverviewSceneHeader {
	media: Media
	metadata_table: MetadataTableItem[]

	constructor(media: Media) {
		this.media = media
		this.metadata_table = this.build_metadata_table(media.metadata ?? {})
	}

	build_metadata_table(metadata: MediaMetadata) {
		let table: MetadataTableItem[] = []

		if (!metadata) {
			return table
		}

		let add_to_table = (keyname: string, prefix: string, values: string[], searchKey: string) => {
			if (values && values.length > 0) {
				// if all values are empty, don't add the key
				if (values.every((v) => !v)) {
					return
				}

				table.push({
					keyname: keyname,
					prefix: prefix,
					values: values,
					searchKey: searchKey,
				})
			}
		}

		const age_rating_num = metadata.age_rating ?? 0
		const year_num = metadata.year ?? 0

		const publishers = [metadata.publisher ?? '']
		const characters = metadata.characters?.filter((c) => !!c) ?? []
		const colorists = metadata.colorists?.filter((c) => !!c) ?? []
		const writers = metadata.writers?.filter((w) => !!w) ?? []
		const pencillers = metadata.pencillers?.filter((p) => !!p) ?? []
		const inkers = metadata.inkers?.filter((i) => !!i) ?? []
		const letterers = metadata.letterers?.filter((l) => !!l) ?? []
		const editors = metadata.editors?.filter((e) => !!e) ?? []
		const genres = metadata.genre?.filter((g) => !!g) ?? []
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

	renderHeader() {
		return (
			<div className="flex flex-col items-center text-center tablet:items-start tablet:text-left">
				<Heading size="sm">{formatBookName(this.media)}</Heading>

				{!!this.metadata_table.length && (
					<div>
						{this.metadata_table.map((metadata_row) => (
							<div className="flex flex-row gap-1 space-x-2">
								<Text>{metadata_row.prefix}</Text>
								{metadata_row.values.map((element) => (
									<SearchLinkBadge
										key={metadata_row.keyname}
										searchKey={metadata_row.searchKey}
										text={element}
									></SearchLinkBadge>
								))}
							</div>
						))}
					</div>
				)}

				<BookLibrarySeriesLinks
					libraryId={this.media.series?.library_id}
					seriesId={this.media.series_id}
					series={this.media.series}
				/>

				<TagList tags={this.media.tags || null} baseUrl={paths.bookSearch()} />
			</div>
		)
	}
}
