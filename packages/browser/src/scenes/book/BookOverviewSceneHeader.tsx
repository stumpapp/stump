import { Badge, Heading, Link, Statistic, Text } from '@stump/components'
import { BookCardFragment, BookOverviewSceneQuery, Tag } from '@stump/graphql'
import { ExternalLink } from 'lucide-react'
import { Suspense } from 'react'

import BadgeList from '@/components/BadgeList'
import ReadMore from '@/components/ReadMore'
import TagList from '@/components/tags/TagList'
import paths from '@/paths'
import { formatBytes } from '@/utils/format'

import BookLibrarySeriesLinks from './BookLibrarySeriesLinks'

type Props = {
	media: NonNullable<BookOverviewSceneQuery['mediaById']>
	book: BookCardFragment
	completedAt?: string | null
}

export default function BookOverviewSceneHeader({ media, book, completedAt }: Props) {
	const metadata = media.metadata
	const tags = media.tags as Tag[] | undefined
	const pages = media.pages ?? 0
	const size = media.size ?? 0

	const hasStats = pages > 0 || size > 0
	const hasMetadataBadges =
		metadata?.publisher || metadata?.language || (metadata?.ageRating && metadata.ageRating > 0)
	const hasGenres = metadata?.genres && metadata.genres.length > 0
	const hasWriters = metadata?.writers && metadata.writers.length > 0
	const hasTags = tags && tags.length > 0
	const hasLinks = metadata?.links && metadata.links.filter((l) => !!l).length > 0

	const readProgress = book.readProgress
	const progressPercent = readProgress?.percentageCompleted
		? Math.round(readProgress.percentageCompleted * 100)
		: null

	return (
		<div className="gap-3 flex w-full flex-col">
			<div className="gap-3 flex flex-wrap items-center">
				<Heading size="lg">{media.resolvedName}</Heading>
				{media.seriesId && (
					<Suspense>
						<BookLibrarySeriesLinks seriesId={media.seriesId} />
					</Suspense>
				)}
			</div>

			{hasStats && (
				<div className="gap-3 sm:grid-cols-3 md:flex md:flex-wrap md:gap-6 grid grid-cols-2">
					{pages > 0 && <Statistic.Item label="Pages" value={pages} />}
					{size > 0 && <Statistic.Item label="Size" value={formatBytes(size) ?? '—'} />}
					{media.extension && (
						<Statistic.Item label="Format" value={media.extension.toUpperCase()} />
					)}
					{metadata?.year && metadata.year > 0 && (
						<Statistic.Item label="Year" value={metadata.year} />
					)}
					{progressPercent != null && progressPercent > 0 && progressPercent < 100 && (
						<Statistic.Item
							label="Progress"
							value={`${progressPercent}%`}
							suffix={readProgress?.page ? `(p. ${readProgress.page})` : undefined}
						/>
					)}
				</div>
			)}

			{hasMetadataBadges && (
				<div className="gap-2 flex flex-wrap items-center">
					{metadata?.publisher && (
						<Badge variant="default" size="xs" rounded="full">
							{metadata.publisher}
						</Badge>
					)}
					{metadata?.language && (
						<Badge variant="default" size="xs" rounded="full">
							{metadata.language}
						</Badge>
					)}
					{metadata?.ageRating && metadata.ageRating > 0 && (
						<Badge variant="warning" size="xs" rounded="full">
							Age {metadata.ageRating}+
						</Badge>
					)}
				</div>
			)}

			{completedAt && (
				<Text size="xs" variant="muted">
					{(book.readHistory?.length ?? 0) > 1 ? 'Last completed' : 'Completed'} on{' '}
					{new Intl.DateTimeFormat(undefined, {
						month: 'long',
						day: 'numeric',
						year: 'numeric',
						hour: 'numeric',
						minute: '2-digit',
					}).format(new Date(completedAt))}
				</Text>
			)}

			{!!metadata?.summary && (
				<div className="max-w-3xl">
					<ReadMore text={metadata.summary} />
				</div>
			)}

			{hasGenres && (
				<div className="gap-1 flex flex-col">
					<Text size="xs" variant="muted">
						Genres
					</Text>
					<BadgeList>
						{metadata!.genres.map((genre) => (
							<Link
								key={genre}
								to={paths.bookSearchWithFilter({
									metadata: { genres: { likeAnyOf: [genre] } },
								})}
								underline={false}
							>
								<Badge variant="secondary" size="xs" rounded="full" className="cursor-pointer">
									{genre}
								</Badge>
							</Link>
						))}
					</BadgeList>
				</div>
			)}

			{hasWriters && (
				<div className="gap-1 flex flex-col">
					<Text size="xs" variant="muted">
						Writers
					</Text>
					<BadgeList>
						{metadata!.writers.map((writer) => (
							<Link
								key={writer}
								to={paths.bookSearchWithFilter({
									metadata: { writers: { likeAnyOf: [writer] } },
								})}
								underline={false}
							>
								<Badge variant="secondary" size="xs" rounded="full" className="cursor-pointer">
									{writer}
								</Badge>
							</Link>
						))}
					</BadgeList>
				</div>
			)}

			{hasTags && (
				<div className="gap-1 flex flex-col">
					<Text size="xs" variant="muted">
						Tags
					</Text>
					<TagList tags={tags} baseUrl={paths.bookSearch()} />
				</div>
			)}

			{hasLinks && (
				<div className="gap-1 flex flex-col">
					<Text size="xs" variant="muted">
						Links
					</Text>
					<BadgeList>
						{metadata!.links
							.filter((l) => !!l)
							.map((link) => {
								let label = link.replace(/^(https?:\/\/)?(www\.)?/, '')
								try {
									label = new URL(link).hostname
								} catch {
									// weird but w/e
								}
								return (
									<Link key={link} href={link} underline={false}>
										<Badge variant="default" size="xs" rounded="full" className="cursor-pointer">
											<span>{label}</span>
											<ExternalLink className="ml-1 h-3 w-3 opacity-90" />
										</Badge>
									</Link>
								)
							})}
					</BadgeList>
				</div>
			)}
		</div>
	)
}
