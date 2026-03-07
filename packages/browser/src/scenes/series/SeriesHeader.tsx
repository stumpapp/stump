import { Badge, cn, Heading, Link, Text } from '@stump/components'
import { formatHumanDuration } from '@stump/i18n'
import { ExternalLink } from 'lucide-react'

import ReadMore from '@/components/ReadMore'
import TagList from '@/components/tags/TagList'
import { ProminentThumbnailImage } from '@/components/thumbnail'
import { usePreferences } from '@/hooks'
import paths from '@/paths'
import { formatBytes } from '@/utils/format'

import { useSeriesContext } from './context'

type StatItemProps = {
	label: string
	value: string | number
	suffix?: string
}

function StatItem({ label, value, suffix }: StatItemProps) {
	return (
		<div className="flex flex-col">
			<Text size="xs" variant="muted">
				{label}
			</Text>
			<Text size="sm" className="font-semibold">
				{value}
				{suffix && (
					<Text size="xs" variant="muted" className="inline">
						{suffix}
					</Text>
				)}
			</Text>
		</div>
	)
}

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
			className={cn('flex w-full flex-col gap-4 p-4', {
				'mx-auto': preferTopBar && !!layoutMaxWidthPx,
			})}
			style={{
				maxWidth: preferTopBar ? layoutMaxWidthPx || undefined : undefined,
			}}
		>
			<div className="flex w-full flex-col items-center gap-4 md:flex-row md:items-start">
				{showThumbnailsInHeaders && (
					<ProminentThumbnailImage src={thumbnail.url} placeholderData={thumbnail.metadata} />
				)}

				<div className="flex w-full flex-col gap-4">
					<Heading size="lg">{resolvedName}</Heading>

					<div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:flex md:flex-wrap md:gap-6">
						<StatItem label="Books" value={stats.bookCount} />
						<StatItem
							label="Completed"
							value={stats.completedBooks}
							suffix={` / ${stats.bookCount}`}
						/>
						<StatItem label="In progress" value={stats.inProgressBooks} />
						{formattedTime && <StatItem label="Reading time" value={formattedTime} />}
						{formattedSize && <StatItem label="Total size" value={formattedSize} />}
					</div>

					{hasMetadataBadges && (
						<div className="flex flex-wrap items-center gap-2">
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
						<div className="flex flex-col gap-1">
							<Text size="xs" variant="muted">
								Genres
							</Text>
							<div className="flex flex-wrap gap-1.5">
								{metadata.genres.map((genre) => (
									<Link
										key={genre}
										to={paths.bookSearchWithFilter({
											metadata: { genres: { anyOf: [genre] } },
										})}
										underline={false}
									>
										<Badge variant="secondary" size="xs" rounded="full" className="cursor-pointer">
											{genre}
										</Badge>
									</Link>
								))}
							</div>
						</div>
					)}

					{hasTags && (
						<div className="flex flex-col gap-1">
							<Text size="xs" variant="muted">
								Tags
							</Text>
							<TagList tags={tags} baseUrl={paths.bookSearch()} />
						</div>
					)}

					{hasLinks && (
						<div className="flex flex-col gap-1">
							<Text size="xs" variant="muted">
								Links
							</Text>
							<div className="flex flex-wrap gap-1.5">
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
							</div>
						</div>
					)}
				</div>
			</div>
		</header>
	)
}
