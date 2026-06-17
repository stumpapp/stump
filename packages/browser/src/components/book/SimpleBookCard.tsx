import { Link, Text } from '@stump/components'
import { FragmentType, graphql, useFragment } from '@stump/graphql'
import { formatDistanceToNow } from 'date-fns'
import { memo, useMemo } from 'react'
import { useMediaMatch } from 'rooks'

import { usePreferences } from '@/hooks/usePreferences'
import { usePaths } from '@/paths'
import { usePrefetchBooksAfterCursor } from '@/scenes/book'

import { ThumbnailImage, ThumbnailPlaceholderData } from '../thumbnail'
import { usePrefetchBook } from './useBookOverview'

const fragment = graphql(`
	fragment SimpleBookCard on Media {
		id
		resolvedName
		createdAt
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
	}
`)

type Props = {
	book: FragmentType<typeof fragment>
	cardWidth?: number
}

export const SimpleBookCard = memo(function SimpleBookCard({ book, ...props }: Props) {
	const data = useFragment(fragment, book)
	const paths = usePaths()

	const { cardWidth, cardHeight } = useSimpleBookCardSize({ cardWidth: props.cardWidth })

	const placeholderData: ThumbnailPlaceholderData | undefined = useMemo(() => {
		const meta = data.thumbnail.metadata
		if (!meta) return undefined
		return {
			averageColor: meta.averageColor,
			colors: meta.colors,
			thumbhash: meta.thumbhash,
		}
	}, [data.thumbnail.metadata])

	const gradient = {
		colors: ['transparent', 'transparent', 'rgba(0, 0, 0, 0.4)', 'rgba(0, 0, 0, 0.85)'],
		direction: 'to bottom',
	}

	const prefetchBook = usePrefetchBook()
	const prefetchBooksAfterCursor = usePrefetchBooksAfterCursor()

	const prefetch = () => Promise.all([prefetchBook(data.id), prefetchBooksAfterCursor(data.id)])

	return (
		<Link
			to={paths.bookOverview(data.id)}
			className="group relative block shrink-0 rounded-thumbnail transition-opacity hover:opacity-90"
			style={{ width: cardWidth }}
			onMouseEnter={prefetch}
		>
			<ThumbnailImage
				src={data.thumbnail.url}
				alt={data.resolvedName}
				size={{ width: cardWidth, height: cardHeight }}
				placeholderData={placeholderData}
				gradient={gradient}
				borderAndShadowStyle={{
					shadowColor: 'rgba(0, 0, 0, 0.2)',
					shadowRadius: 2,
				}}
			/>

			<div className="bottom-0 left-0 right-0 p-2 pointer-events-none absolute z-30">
				<Text
					className="text-sm font-semibold leading-tight text-white line-clamp-2 text-wrap!"
					style={{
						textShadow: '1px 1px 2px rgba(0, 0, 0, 0.5)',
					}}
				>
					{data.resolvedName}
				</Text>
				<Text
					className="mt-0.5 text-xs text-gray-200"
					style={{
						textShadow: '1px 1px 2px rgba(0, 0, 0, 0.5)',
					}}
				>
					{formatDistanceToNow(new Date(data.createdAt), { addSuffix: true })}
				</Text>
			</div>
		</Link>
	)
})

const IMAGE_WIDTH_MOBILE = 112
const IMAGE_WIDTH_TABLET = 140

export function useSimpleBookCardSize(params: { cardWidth?: number } = {}) {
	const {
		preferences: { thumbnailRatio },
	} = usePreferences()

	const isAtLeastMedium = useMediaMatch('(min-width: 768px)')
	const cardWidth = params?.cardWidth ?? (isAtLeastMedium ? IMAGE_WIDTH_TABLET : IMAGE_WIDTH_MOBILE)
	const cardHeight = cardWidth / thumbnailRatio

	return { cardWidth, cardHeight }
}
