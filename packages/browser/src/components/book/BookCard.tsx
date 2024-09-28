import { usePrefetchMediaByID, useSDK } from '@stump/client'
import { EntityCard, Text } from '@stump/components'
import { FileStatus, Media } from '@stump/types'
import pluralize from 'pluralize'
import { useCallback, useMemo } from 'react'

import paths from '@/paths'
import { formatBookName, formatBytes } from '@/utils/format'
import { prefetchMediaPage } from '@/utils/prefetch'

export type BookCardProps = {
	media: Media
	readingLink?: boolean
	fullWidth?: boolean
	variant?: 'cover' | 'default'
	onSelect?: (media: Media) => void
}

type EntityCardProps = React.ComponentPropsWithoutRef<typeof EntityCard>

export default function BookCard({
	media,
	readingLink,
	fullWidth,
	variant = 'default',
	onSelect,
}: BookCardProps) {
	const { sdk } = useSDK()
	const { prefetch } = usePrefetchMediaByID(media.id)

	const isCoverOnly = variant === 'cover'

	const handleHover = () => {
		if (!readingLink) {
			prefetch()
		}

		const currentPage = media.current_page || -1
		if (currentPage > 0) {
			prefetchMediaPage(sdk, media.id, currentPage)
		}
	}

	const getSubtitle = (media: Media) => {
		if (isCoverOnly) {
			return null
		}

		const isMissing = media.status === FileStatus.Missing
		if (isMissing) {
			return (
				<Text size="xs" className="uppercase text-amber-500">
					File Missing
				</Text>
			)
		}

		const progressString = getProgress()
		if (progressString != null) {
			const isEpubProgress = !!media.current_epubcfi
			const pagesLeft = media.pages - (media.current_page || 0)

			return (
				<div className="flex items-center justify-between">
					<Text size="xs" variant="muted">
						{getProgress()}%
					</Text>
					{!isEpubProgress && (
						<Text size="xs" variant="muted">
							{pagesLeft} {pluralize('page', pagesLeft)} left
						</Text>
					)}
				</div>
			)
		}

		return (
			<div className="flex items-center justify-between">
				<Text size="xs" variant="muted">
					{formatBytes(media.size.valueOf())}
				</Text>
			</div>
		)
	}

	const getProgress = useCallback(() => {
		const { active_reading_session, finished_reading_sessions } = media

		if (isCoverOnly || (!active_reading_session && !finished_reading_sessions)) {
			return null
		} else if (active_reading_session) {
			const { epubcfi, percentage_completed, page } = active_reading_session

			if (epubcfi && percentage_completed) {
				return Math.round(percentage_completed * 100)
			} else if (page) {
				const pages = media.pages

				const percent = Math.round((page / pages) * 100)
				return Math.min(Math.max(percent, 0), 100) // Clamp between 0 and 100
			}
		} else if (finished_reading_sessions?.length) {
			return 100
		}

		return null
	}, [isCoverOnly, media])

	const href = useMemo(() => {
		if (onSelect) {
			return undefined
		}

		return readingLink
			? paths.bookReader(media.id, {
					epubcfi: media.current_epubcfi,
					page: media.current_page || undefined,
				})
			: paths.bookOverview(media.id)
	}, [readingLink, media.id, media.current_epubcfi, media.current_page, onSelect])

	const propsOverrides = useMemo(() => {
		let overrides = (
			isCoverOnly
				? {
						className: 'flex-shrink-0 flex-auto',
						href: undefined,
						progress: undefined,
						subtitle: undefined,
						title: undefined,
					}
				: {}
		) as Partial<EntityCardProps>

		if (onSelect) {
			overrides = {
				...overrides,
				onClick: () => onSelect(media),
			}
		}

		return overrides
	}, [onSelect, isCoverOnly, media])

	return (
		<EntityCard
			key={media.id}
			title={formatBookName(media)}
			href={href}
			fullWidth={fullWidth}
			imageUrl={sdk.media.thumbnailURL(media.id)}
			progress={getProgress()}
			subtitle={getSubtitle(media)}
			onMouseEnter={handleHover}
			isCover={isCoverOnly}
			{...propsOverrides}
		/>
	)
}
