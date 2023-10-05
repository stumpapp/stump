import { getMediaThumbnail } from '@stump/api'
import { prefetchMedia } from '@stump/client'
import { EntityCard, Text } from '@stump/components'
import { FileStatus, Media } from '@stump/types'
import pluralize from 'pluralize'

import paths from '../../paths'
import { formatBytes } from '../../utils/format'
import { prefetchMediaPage } from '../../utils/prefetch'

export type MediaCardProps = {
	media: Media
	readingLink?: boolean
	fullWidth?: boolean
	variant?: 'cover' | 'default'
}

export default function MediaCard({
	media,
	readingLink,
	fullWidth,
	variant = 'default',
}: MediaCardProps) {
	const isCoverOnly = variant === 'cover'

	const handleHover = () => {
		if (!readingLink) {
			prefetchMedia(media.id)
		}

		const currentPage = media.current_page || -1
		if (currentPage > 0) {
			prefetchMediaPage(media.id, currentPage)
		}
	}

	const getSubtitle = (media: Media) => {
		if (isCoverOnly) {
			return null
		}

		const isMissing = media.status === FileStatus.Missing
		if (isMissing) {
			return (
				<Text size="xs" className="uppercase text-amber-500 dark:text-amber-400">
					File Missing
				</Text>
			)
		}

		const progressString = getProgress()
		if (progressString) {
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
					{formatBytes(media.size)}
				</Text>
			</div>
		)
	}

	function getProgress() {
		if (isCoverOnly || !media.current_page) {
			return null
		}

		if (media.current_epubcfi) {
			const firstWithPercent = media.read_progresses?.find((rp) => !!rp.percentage_completed)
			if (firstWithPercent) {
				return Math.round(firstWithPercent.percentage_completed! * 100)
			}
		} else {
			const page = media.current_page
			const pages = media.pages

			const percent = Math.round((page / pages) * 100)
			if (percent > 100) {
				return 100
			}

			return percent
		}

		return null
	}

	const href = readingLink
		? paths.bookReader(media.id, {
				epubcfi: media.current_epubcfi,
				page: media.current_page || undefined,
		  })
		: paths.bookOverview(media.id)

	const overrides = isCoverOnly
		? {
				className: 'flex-shrink-0 flex-auto',
				href: undefined,
				progress: undefined,
				subtitle: undefined,
				title: undefined,
		  }
		: {}

	return (
		<EntityCard
			key={media.id}
			title={media.name}
			href={href}
			fullWidth={fullWidth}
			imageUrl={getMediaThumbnail(media.id)}
			progress={getProgress()}
			subtitle={getSubtitle(media)}
			onMouseEnter={handleHover}
			size={isCoverOnly ? 'lg' : 'default'}
			{...overrides}
		/>
	)
}
