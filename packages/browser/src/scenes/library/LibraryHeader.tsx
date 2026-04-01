import { Badge, cn, Heading, Link, Statistic, Text } from '@stump/components'
import { formatHumanDuration } from '@stump/i18n'

import BadgeList from '@/components/BadgeList'
import ReadMore from '@/components/ReadMore'
import TagList from '@/components/tags/TagList'
import { ProminentThumbnailImage } from '@/components/thumbnail'
import { usePreferences } from '@/hooks'
import paths from '@/paths'
import { formatBytes } from '@/utils/format'

import { useLibraryContext } from './context'

// TODO(localization): Use localized strings for labels etc
export default function LibraryHeader() {
	const {
		preferences: { primaryNavigationMode, layoutMaxWidthPx, showThumbnailsInHeaders },
	} = usePreferences()
	const {
		library: { name, description, stats, tags, thumbnail, genres, publishers },
	} = useLibraryContext()

	const preferTopBar = primaryNavigationMode === 'TOPBAR'

	const formattedTime = stats?.totalReadingTimeSeconds
		? formatHumanDuration(stats.totalReadingTimeSeconds, { significantUnits: 2 })
		: null
	const formattedSize = stats?.totalBytes ? formatBytes(stats.totalBytes) : null

	const hasPublishers = publishers && publishers.length > 0
	const hasGenres = genres && genres.length > 0
	const hasTags = tags && tags.length > 0

	return (
		<header
			className={cn('gap-4 p-4 flex w-full flex-col', {
				'mx-auto': preferTopBar && !!layoutMaxWidthPx,
			})}
			style={{
				maxWidth: preferTopBar ? layoutMaxWidthPx || undefined : undefined,
			}}
		>
			<div className="gap-4 md:flex-row md:items-start flex w-full flex-col items-center">
				{showThumbnailsInHeaders && (
					<ProminentThumbnailImage src={thumbnail.url} placeholderData={thumbnail.metadata} />
				)}

				<div className="gap-4 flex w-full flex-col">
					<Heading size="lg">{name}</Heading>

					{stats && (
						<div className="gap-3 sm:grid-cols-3 md:flex md:flex-wrap md:gap-6 grid grid-cols-2">
							<Statistic.Item label="Series" value={stats.seriesCount} />
							<Statistic.Item label="Books" value={stats.bookCount} />
							<Statistic.Item
								label="Completed"
								value={stats.completedBooks}
								suffix={` / ${stats.bookCount}`}
							/>
							<Statistic.Item label="In progress" value={stats.inProgressBooks} />
							{formattedTime && <Statistic.Item label="Reading time" value={formattedTime} />}
							{formattedSize && <Statistic.Item label="Total size" value={formattedSize} />}
						</div>
					)}

					{hasPublishers && (
						<BadgeList>
							{publishers.map((publisher) => (
								<Badge key={publisher} variant="default" size="xs" rounded="full">
									{publisher}
								</Badge>
							))}
						</BadgeList>
					)}

					{!!description && (
						<div className="max-w-3xl">
							<ReadMore text={description} />
						</div>
					)}

					{hasGenres && (
						<div className="gap-1 flex flex-col">
							<Text size="xs" variant="muted">
								Genres
							</Text>
							<BadgeList>
								{genres.map((genre) => (
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

					{hasTags && (
						<div className="gap-1 flex flex-col">
							<Text size="xs" variant="muted">
								Tags
							</Text>
							<TagList tags={tags} baseUrl={paths.bookSearch()} />
						</div>
					)}
				</div>
			</div>
		</header>
	)
}
