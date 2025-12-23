import { cn, ProgressBar, Text } from '@stump/components'
import { FragmentType, graphql, useFragment } from '@stump/graphql'
import pluralize from 'pluralize'
import { memo, useCallback, useMemo } from 'react'

import { Link } from '@/context'
import { usePreferences } from '@/hooks/usePreferences'
import { usePaths } from '@/paths'
import { usePrefetchBooksAfterCursor } from '@/scenes/book/BooksAfterCursor'
import { formatBytes } from '@/utils/format'

import { ThumbnailImage } from '../thumbnail/ThumbnailImage'
import { usePrefetchBook } from './useBookOverview'

export const BookCard2Fragment = graphql(`
	fragment BookCard2 on Media {
		id
		resolvedName
		extension
		pages
		size
		status
		thumbnail {
			url
			metadata {
				averageColor
				colors {
					color
					percentage
				}
				thumbhash
			}
		}
		readProgress {
			percentageCompleted
			epubcfi
			page
			updatedAt
		}
		readHistory {
			__typename
			completedAt
		}
	}
`)

type Props = {
	fragment: FragmentType<typeof BookCard2Fragment>
	readingLink?: boolean
	onSelect?: () => void
}

const BookCard2 = memo(function BookCard2({ fragment, readingLink, onSelect }: Props) {
	const data = useFragment(BookCard2Fragment, fragment)
	const paths = usePaths()

	const {
		preferences: { thumbnailRatio },
	} = usePreferences()

	const prefetchBook = usePrefetchBook()
	const prefetchBooksAfterCursor = usePrefetchBooksAfterCursor()

	const prefetch = useCallback(
		() => Promise.all([prefetchBook(data.id), prefetchBooksAfterCursor(data.id)]),
		[prefetchBook, prefetchBooksAfterCursor, data.id],
	)

	const progress = useMemo(() => {
		if (!data.readProgress && !data.readHistory) {
			return null
		} else if (data.readProgress) {
			const { epubcfi, percentageCompleted, page } = data.readProgress
			if (epubcfi && percentageCompleted) {
				return Math.round(percentageCompleted * 100)
			} else if (page) {
				const percent = Math.round((page / data.pages) * 100)
				return Math.min(Math.max(percent, 0), 100)
			}
		} else if (data.readHistory?.length) {
			return 100
		}

		return null
	}, [data])

	const placeholderData = useMemo(() => {
		const meta = data.thumbnail.metadata
		if (!meta) return undefined
		return {
			averageColor: meta.averageColor,
			colors: meta.colors,
			thumbhash: meta.thumbhash,
		}
	}, [data.thumbnail.metadata])

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
	}, [readingLink, data.id, onSelect, data.readProgress, paths])

	const isMissing = data.status === 'MISSING'
	const isEbookProgress = !!data.readProgress?.epubcfi
	const pagesLeft = data.pages - (data.readProgress?.page || 0)
	const progressPercent = progress ?? 0

	const renderSubtitle = () => {
		if (isMissing) {
			return (
				<Text size="xs" className="uppercase text-amber-500">
					File Missing
				</Text>
			)
		}

		if (progressPercent > 0 && progressPercent < 100) {
			return (
				<div className="flex items-center justify-between gap-1">
					<Text size="xs" variant="muted">
						{progressPercent}%
					</Text>
					{!isEbookProgress && (
						<Text size="xs" variant="muted">
							{pagesLeft} {pluralize('page', pagesLeft)} left
						</Text>
					)}
				</div>
			)
		} else if (progressPercent === 100) {
			return (
				<Text size="xs" variant="muted">
					Completed
				</Text>
			)
		}

		return (
			<Text size="xs" variant="muted">
				{formatBytes(data.size.valueOf())}
			</Text>
		)
	}

	const handleClick = onSelect ? () => onSelect() : undefined

	const Comp = href ? Link : 'div'
	const props = href ? { to: href } : {}

	return (
		// @ts-expect-error: It's okay
		<Comp
			{...props}
			onClick={handleClick}
			onMouseEnter={prefetch}
			className={cn(
				'group flex w-full flex-col gap-1',
				'rounded-lg border border-transparent p-1 transition-colors duration-100',
				'hover:border-edge-brand focus-visible:border-edge-brand focus-visible:outline-none',
			)}
		>
			<div className="relative w-full" style={{ aspectRatio: thumbnailRatio }}>
				<ThumbnailImage
					src={data.thumbnail.url}
					alt={data.resolvedName}
					size={{ width: '100%', height: '100%' }}
					placeholderData={placeholderData}
					placeholderVariant="colorful"
					lazy
					borderAndShadowStyle={{
						borderRadius: 8,
						shadowColor: 'rgba(0, 0, 0, 0.15)',
						shadowRadius: 2,
					}}
				/>
			</div>

			{progressPercent > 0 && (
				<ProgressBar
					value={progressPercent}
					max={100}
					variant="primary-dark"
					size="sm"
					className="-mt-0.5"
				/>
			)}

			<div className="flex h-[52px] flex-col gap-0.5 px-0.5">
				<Text size="sm" className="line-clamp-2 font-medium leading-tight">
					{data.resolvedName}
				</Text>
				{renderSubtitle()}
			</div>
		</Comp>
	)
})

export default BookCard2
