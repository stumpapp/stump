import { Badge, cn, Heading, Link, Statistic, Text } from '@stump/components'
import { formatHumanDuration } from '@stump/i18n'
import { ExternalLink } from 'lucide-react'

import BadgeList from '@/components/BadgeList'
import ReadMore from '@/components/ReadMore'
import TagList from '@/components/tags/TagList'
import { ProminentThumbnailImage } from '@/components/thumbnail'
import { usePreferences } from '@/hooks'
import paths from '@/paths'
import { formatBytes } from '@/utils/format'

import { useSeriesContext } from './context'

// TODO(localization): Use localized strings for labels etc
export default function SeriesHeader() {
	const {
		preferences: { primaryNavigationMode, layoutMaxWidthPx, showThumbnailsInHeaders },
	} = usePreferences()
	const {
		series: { resolvedName, resolvedDescription, tags, thumbnail, stats, metadata },
	} = useSeriesContext()

	const preferTopBar = primaryNavigationMode === 'TOPBAR'

	const formattedTime = stats.totalReadingTimeSeconds
		? formatHumanDuration(stats.totalReadingTimeSeconds, { significantUnits: 2 })
		: null
	const formattedSize = stats.totalBytes ? formatBytes(stats.totalBytes) : null

	const hasMetadataBadges = metadata?.status || metadata?.publisher || metadata?.year
	const hasGenres = metadata?.genres && metadata.genres.length > 0
	const hasTags = tags && tags.length > 0
	const hasLinks = metadata?.links && metadata.links.length > 0

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
					<Heading size="lg">{resolvedName}</Heading>

					<div className="gap-3 sm:grid-cols-3 md:flex md:flex-wrap md:gap-6 grid grid-cols-2">
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

					{hasMetadataBadges && (
						<div className="gap-2 flex flex-wrap items-center">
							{metadata?.publisher && (
								<Badge variant="default" size="xs" rounded="full">
									{metadata.publisher}
								</Badge>
							)}
							{metadata?.year && (
								<Badge variant="default" size="xs" rounded="full">
									{metadata.year}
								</Badge>
							)}
							{metadata?.status && (
								<Badge variant="primary" size="xs" rounded="full">
									{metadata.status}
								</Badge>
							)}
						</div>
					)}

					{!!resolvedDescription && (
						<div className="max-w-3xl">
							<ReadMore text={resolvedDescription} />
						</div>
					)}

					{hasGenres && (
						<div className="gap-1 flex flex-col">
							<Text size="xs" variant="muted">
								Genres
							</Text>
							<BadgeList>
								{metadata.genres.map((genre) => (
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

					{hasLinks && (
						<div className="gap-1 flex flex-col">
							<Text size="xs" variant="muted">
								Links
							</Text>
							<BadgeList>
								{metadata.links.map((link) => {
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
			</div>
		</header>
	)
}
