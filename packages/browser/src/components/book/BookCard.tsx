import { Text } from '@stump/components'
import pluralize from 'pluralize'
import { type ComponentPropsWithoutRef, useCallback, useMemo } from 'react'

import paths from '@/paths'
import { formatBytes } from '@/utils/format'

import { EntityCard } from '../entity'
import { usePrefetchBook } from '@/scenes/book'

interface BookCardFragment {
	id: string
	resolvedName: string
	pages: number
	size: number
	status: string
	thumbnail: {
		url: string
	}
	readProgress?: {
		percentageCompleted?: number | null
		epubcfi?: string | null
		page?: number | null
	} | null
	readHistory?: Array<{
		__typename: string
	}> | null
}

export type BookCardProps = {
	data: BookCardFragment
	readingLink?: boolean
	fullWidth?: boolean
	variant?: 'cover' | 'default'
	onSelect?: () => void
}

type EntityCardProps = ComponentPropsWithoutRef<typeof EntityCard>

export default function BookCard({
	data,
	readingLink,
	fullWidth,
	variant = 'default',
	onSelect,
}: BookCardProps) {
	const prefetchBook = usePrefetchBook(data.id)

	const isCoverOnly = variant === 'cover'

	const getProgress = useCallback(() => {
		if (isCoverOnly || (!data.readProgress && !data.readHistory)) {
			return null
		} else if (data.readProgress) {
			const { epubcfi, percentageCompleted, page } = data.readProgress
			if (epubcfi && percentageCompleted) {
				return Math.round(percentageCompleted * 100)
			} else if (page) {
				const pages = data.pages

				const percent = Math.round((page / pages) * 100)
				return Math.min(Math.max(percent, 0), 100) // Clamp between 0 and 100
			}
		} else if (data.readHistory?.length) {
			return 100
		}

		return null
	}, [isCoverOnly, data])

	const getSubtitle = useCallback(() => {
		if (isCoverOnly) {
			return null
		}

		const isMissing = data.status === 'MISSING'
		if (isMissing) {
			return (
				<Text size="xs" className="uppercase text-amber-500">
					File Missing
				</Text>
			)
		}

		const percentage = getProgress()
		if (percentage != null && percentage < 100.0) {
			const isEpubProgress = !!data.readProgress?.epubcfi
			const pagesLeft = data.pages - (data.readProgress?.page || 0)

			return (
				<div className="flex items-center justify-between">
					<Text size="xs" variant="muted">
						{percentage}%
					</Text>
					{!isEpubProgress && (
						<Text size="xs" variant="muted">
							{pagesLeft} {pluralize('page', pagesLeft)} left
						</Text>
					)}
				</div>
			)
		} else if (percentage === 100.0) {
			return (
				<Text size="xs" variant="muted">
					Completed
				</Text>
			)
		}

		return (
			<div className="flex items-center justify-between">
				<Text size="xs" variant="muted">
					{formatBytes(data.size.valueOf())}
				</Text>
			</div>
		)
	}, [getProgress, isCoverOnly, data])

	const href = useMemo(() => {
		if (onSelect) {
			return undefined
		}

		return readingLink
			? paths.bookReader(data.id, {
					epubcfi: data.readProgress?.epubcfi,
					page: data.readProgress?.page ?? undefined,
				})
			: paths.bookOverview(data.id)
	}, [readingLink, data.id, onSelect, data.readProgress])

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
				onClick: () => onSelect(),
			}
		}

		return overrides
	}, [onSelect, isCoverOnly])

	return (
		<EntityCard
			title={data.resolvedName}
			href={href}
			fullWidth={fullWidth}
			imageUrl={data.thumbnail.url}
			progress={getProgress()}
			subtitle={getSubtitle()}
			onMouseEnter={prefetchBook}
			isCover={isCoverOnly}
			{...propsOverrides}
		/>
	)
}
