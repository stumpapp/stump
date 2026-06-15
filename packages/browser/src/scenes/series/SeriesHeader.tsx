import { useGraphQLMutation } from '@stump/client'
import { Badge, Button, cn, Heading, Link, Statistic, Text } from '@stump/components'
import { DropdownItemGroup, DropdownMenu } from '@stump/components/dropdown/DropdownMenu'
import { graphql } from '@stump/graphql'
import { formatHumanDuration } from '@stump/i18n'
import { useQueryClient } from '@tanstack/react-query'
import { BookOpenCheck, EllipsisVertical, ExternalLink } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'

import BadgeList from '@/components/BadgeList'
import ReadMore from '@/components/ReadMore'
import TagList from '@/components/tags/TagList'
import { ProminentThumbnailImage } from '@/components/thumbnail'
import { usePreferences } from '@/hooks'
import paths from '@/paths'
import { formatBytes } from '@/utils/format'

import CompleteSeriesConfirmation from './CompleteSeriesConfirmation'
import { useSeriesContext } from './context'

const completeSeriesMutation = graphql(`
	mutation SeriesActionComplete($id: ID!) {
		finishSeriesProgress(id: $id)
	}
`)

// TODO(localization): Use localized strings for labels etc
export default function SeriesHeader() {
	const {
		preferences: { primaryNavigationMode, layoutMaxWidthPx, showThumbnailsInHeaders },
	} = usePreferences()
	const {
		series: { id, resolvedName, resolvedDescription, tags, thumbnail, stats, metadata },
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
	const [showCompleteSeriesConfirmation, setShowCompleteSeriesConfirmation] = useState(false)

	const client = useQueryClient()

	const onSuccess = () => {
		client.invalidateQueries({ queryKey: ['seriesBooks', id], exact: false })
	}

	const { mutate: completeSeries } = useGraphQLMutation(completeSeriesMutation, {
		onSuccess,
		onError: (error) => {
			console.error(error)
			toast.error('Failed to update book completion status')
		},
	})

	const actions = useMemo(
		() => ({
			completeSeries,
		}),
		[completeSeries],
	)

	const groups = useMemo<DropdownItemGroup[]>(
		() => [
			{
				items: [
					{
						label: 'Mark series as read',
						leftIcon: <BookOpenCheck className="mr-2 h-4 w-4" />,
						onClick: () => {
							setShowCompleteSeriesConfirmation(true)
						},
					},
				],
			},
		],
		[],
	)

	return (
		<>
			<CompleteSeriesConfirmation
				isOpen={showCompleteSeriesConfirmation}
				onCancel={() => setShowCompleteSeriesConfirmation(false)}
				onConfirm={() => {
					actions.completeSeries({ id: id })
					setShowCompleteSeriesConfirmation(false)
				}}
			/>
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
						<div className="gap-4 flex">
							<Heading size="lg">{resolvedName}</Heading>

							<DropdownMenu
								align="end"
								contentWrapperClassName="w-48"
								trigger={
									<Button variant="outline" size="icon" className="h-8 w-8 shrink-0">
										<EllipsisVertical className="h-4 w-4" />
									</Button>
								}
								groups={groups}
							/>
						</div>

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
											<Badge
												variant="secondary"
												size="xs"
												rounded="full"
												className="cursor-pointer"
											>
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
								<TagList
									tags={tags}
									buildHref={(tag) => paths.bookSearchWithFilter({ tags: { anyOf: [tag.name] } })}
								/>
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
												<Badge
													variant="default"
													size="xs"
													rounded="full"
													className="cursor-pointer"
												>
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
		</>
	)
}
