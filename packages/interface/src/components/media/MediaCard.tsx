import { getMediaThumbnail } from '@stump/api'
import { prefetchMedia } from '@stump/client'
import { EntityCard, Text } from '@stump/components'
import { FileStatus, Media } from '@stump/types'
import pluralize from 'pluralize'

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

		if (media.current_page) {
			prefetchMediaPage(media.id, media.current_page)
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

		const hasProgress = (media.current_page || 0) > 0
		if (hasProgress) {
			const pagesLeft = media.pages - (media.current_page || 0)
			return (
				<div className="flex items-center justify-between">
					<Text size="xs" variant="muted">
						{getProgress(media.current_page, media.pages)}%
					</Text>
					<Text size="xs" variant="muted">
						{pagesLeft} {pluralize('page', pagesLeft)} left
					</Text>
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

	function getProgress(page: number | null | undefined, pages: number) {
		if (isCoverOnly || !page) {
			return undefined
		}

		const percent = Math.round((page / pages) * 100)
		if (percent > 100) {
			return 100
		}

		return percent
	}

	const href =
		readingLink && media.current_page
			? `/books/${media.id}/pages/${media.current_page ?? 1}`
			: `/books/${media.id}`

	const overrides = isCoverOnly
		? {
				className: 'flex-shrink',
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
			progress={getProgress(media.current_page, media.pages)}
			subtitle={getSubtitle(media)}
			onMouseEnter={handleHover}
			size={isCoverOnly ? 'lg' : 'default'}
			{...overrides}
		/>
	)
}
