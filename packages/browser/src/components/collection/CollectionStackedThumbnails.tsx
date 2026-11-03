// NOTE: this is really close port of what the mobile app has, it may wind up needing a little
// more tweaking for web but should be fine. the biggest differences are:
// - i did not mess with colorjs for now for blending, just used css (which i think is okay here)
// - there are no color fallbacks, expo has the palette gradient but here i just did bg-muted

import { cn } from '@stump/components'
import { useMemo } from 'react'

import { ThumbnailImage, ThumbnailPlaceholderData } from '@/components/thumbnail'
import { usePreferences } from '@/hooks/usePreferences'

import { getLayoutConfig } from './getLayoutConfig'

const BASE_THUMBNAIL_WIDTH = 0.282

export type StackedThumbnail = {
	url: string
	metadata?: ThumbnailPlaceholderData | null
}

type Props = {
	thumbnails: StackedThumbnail[]
	layoutNumber: number | undefined
	className?: string
}

export function CollectionStackedThumbnails({ thumbnails, layoutNumber, className }: Props) {
	const {
		preferences: { thumbnailRatio },
	} = usePreferences()

	const layout = layoutNumber === undefined ? [] : getLayoutConfig(thumbnails.length, layoutNumber)

	const background = useMemo(() => {
		const avgColors = thumbnails.map((t) => t.metadata?.averageColor)
		const midIndex = thumbnails.length === 5 ? 2 : thumbnails.length === 3 ? 1 : undefined

		// Using 5 or 4 colours is too busy so:
		// 3 or 5 thumbnails -> 3 colours
		// 2 or 4 thumbnails -> 2 colours
		let usableColors: string[] | undefined
		if (avgColors.at(0) && midIndex && avgColors.at(midIndex) && avgColors.at(-1)) {
			usableColors = [avgColors.at(0)!, avgColors.at(midIndex)!, avgColors.at(-1)!]
		} else if (avgColors.at(0) && avgColors.at(-1)) {
			usableColors = [avgColors.at(0)!, avgColors.at(-1)!]
		}

		if (!usableColors) return undefined
		const stops = usableColors.map((c) => `color-mix(in oklab, ${c} 50%, black)`)
		return `linear-gradient(75deg, ${stops.join(', ')})`
	}, [thumbnails])

	return (
		<div
			className={cn(
				'shadow-sm relative w-full overflow-hidden rounded-xl border border-border/50 bg-muted',
				className,
			)}
			style={{ aspectRatio: thumbnailRatio / BASE_THUMBNAIL_WIDTH, background }}
		>
			{layout.map((config, index) => {
				const thumbnail = thumbnails[index]
				if (!thumbnail) return null

				const width = BASE_THUMBNAIL_WIDTH * config.scale
				return (
					<div
						key={index}
						className="bottom-0 absolute"
						style={{
							zIndex: config.zIndex,
							width: `${width * 100}%`,
							left: `${(config.x - width / 2) * 100}%`,
							transform: `translateY(${(config.y / config.scale) * 100}%)`,
						}}
					>
						<div style={{ aspectRatio: thumbnailRatio }}>
							<ThumbnailImage
								src={thumbnail.url}
								placeholderData={thumbnail.metadata}
								size={{ width: '100%', height: '100%' }}
								borderAndShadowStyle={{
									shadowRadius: 3,
									shadowColor: 'rgba(0 0 0 / 0.5)',
								}}
								lazy
							/>
						</div>
					</div>
				)
			})}

			<div className="inset-0 to-black/80 pointer-events-none absolute z-60 bg-linear-to-b from-transparent from-40%" />
		</div>
	)
}
