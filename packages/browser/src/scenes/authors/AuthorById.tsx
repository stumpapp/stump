import { useSuspenseGraphQL } from '@stump/client'
import { Avatar, Breadcrumbs, Heading, MiniStatCard, Text } from '@stump/components'
import { graphql } from '@stump/graphql'
import { BookOpen, LibraryBig } from 'lucide-react'
import { Helmet } from 'react-helmet'
import { useParams } from 'react-router'
import { useMediaMatch } from 'rooks'

import { SimpleBookCard, useSimpleBookCardSize } from '@/components/book'
import { SceneContainer } from '@/components/container'
import MultiRowHorizontalCardList from '@/components/MultiRowHorizontalCardList'
import ReadMore from '@/components/ReadMore'
import { PageHeader } from '@/components/sharedLayout'
import { ThumbnailEntityCard } from '@/components/thumbnail'
import { usePaths } from '@/paths'

const query = graphql(`
	query AuthorByIdWeb($id: ID!) {
		authorById(id: $id) {
			name
			biography
			avatar {
				url
			}
			books {
				id
				...SimpleBookCard
			}
			series {
				id
				resolvedName
				mediaCount
				thumbnail {
					url
					metadata {
						averageColor
						thumbhash
					}
				}
			}
		}
	}
`)
// TODO: ^ once metadata library merges can use thumbnailStack {...}
// TODO: obv localize

// TODO: dump:
// somehow management modality will need to be added, i guess an ellipsis menu like i do elsewhere is sufficient. i think really
// what would be good is:
// - fetch metadata
// - edit metadata / match details etc, basically the match flow from media
//   ^ on that note, bulk is a big lift but maybe some day. fine for one at a time for now
//
// separately, sorting options for books/series would be nice. i've mostly been looking at hardcover as a ref here and think
// things that would be nice:
// - sort by release date vs add date
// - sort by popularity (on server? idk, less priority)

export default function AuthorById() {
	const { id } = useParams()
	const paths = usePaths()
	const { cardWidth, cardHeight } = useSimpleBookCardSize()
	const isAtLeastLarge = useMediaMatch('(min-width: 1024px)')
	const {
		data: { authorById: author },
	} = useSuspenseGraphQL(query, ['authorById', id], { id: id ?? '' })

	return (
		<>
			<Helmet>
				<title>Stump | {author.name}</title>
			</Helmet>

			<PageHeader>
				<PageHeader.Start>
					<Breadcrumbs
						segments={[
							{ label: 'Authors', to: '/authors' },
							{
								label: author.name,
								noShrink: true,
							},
						]}
					/>
				</PageHeader.Start>
			</PageHeader>

			<SceneContainer className="gap-8 @container">
				<div className="gap-5 @md:grid-cols-[9rem_minmax(0,1fr)] grid grid-cols-1">
					<Avatar
						className="h-32 w-32 text-3xl @md:mx-0 mx-auto"
						fallback={author.name}
						fallbackWrapperClassName="text-3xl font-medium"
						src={author.avatar.url || undefined}
					/>

					<div className="gap-4 min-w-0 flex flex-col justify-center">
						<Heading size="lg" className="wrap-break-word">
							{author.name}
						</Heading>

						{author.biography && <ReadMore text={author.biography} muted />}

						<div className="gap-2 flex flex-wrap">
							<MiniStatCard
								icon={BookOpen}
								value={author.books.length}
								suffix={author.books.length === 1 ? 'book' : 'books'}
							/>
							<MiniStatCard icon={LibraryBig} value={author.series.length} suffix="series" />
						</div>
					</div>
				</div>

				<MultiRowHorizontalCardList
					title={
						<SectionHeading id="author-books-heading" label="Books" count={author.books.length} />
					}
					items={author.books}
					keyExtractor={(book) => book.id}
					renderItem={(book) => (
						<SimpleBookCard book={book} cardWidth={cardWidth} subtitle={null} />
					)}
					cardHeight={cardHeight}
					cardWidth={cardWidth}
					rowCount={isAtLeastLarge ? 3 : 1}
					emptyState={<EmptySection message="No books associated with this author yet" />}
				/>

				<section className="gap-3 flex flex-col" aria-labelledby="author-series-heading">
					<SectionHeading id="author-series-heading" label="Series" count={author.series.length} />

					{author.series.length > 0 && (
						<div className="gap-3 sm:gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 grid grid-cols-2">
							{author.series.map((series) => (
								<ThumbnailEntityCard
									key={series.id}
									href={paths.seriesOverview(series.id)}
									imageUrl={series.thumbnail.url}
									placeholderData={series.thumbnail.metadata}
									title={series.resolvedName}
									subtitle={
										<Text size="xs" variant="muted">
											{series.mediaCount} {series.mediaCount === 1 ? 'book' : 'books'}
										</Text>
									}
								/>
							))}
						</div>
					)}

					{!author.series.length && (
						<EmptySection message="No series associated with this author yet" />
					)}
				</section>
			</SceneContainer>
		</>
	)
}

type SectionHeadingProps = {
	/* id really just for accessibility annotations, trying to be better about that */
	id?: string
	label: string
	count: number
}

function SectionHeading({ id, label, count }: SectionHeadingProps) {
	return (
		<div className="gap-2 flex items-center">
			<Heading id={id} size="sm">
				{label}
			</Heading>
			<MiniStatCard value={count} />
		</div>
	)
}

function EmptySection({ message }: { message: string }) {
	return (
		<div className="px-4 py-3 max-w-fit self-start rounded-lg border border-dashed border-border">
			<Text size="sm" variant="muted">
				{message}
			</Text>
		</div>
	)
}
