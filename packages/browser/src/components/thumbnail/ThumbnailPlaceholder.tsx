import { selectMeshColors } from '@stump/client'
import { cn } from '@stump/components'
import { ImageColor } from '@stump/graphql'
import { useMemo } from 'react'
import { thumbHashToDataURL } from 'thumbhash'

// TODO: Support persisting thumbnailPlaceholder preference to a user preferences store,
// similar to how Expo uses usePreferencesStore. Maybe just put it in the DB too so it
// syncs across devices/platforms.
export type ThumbnailPlaceholderVariant = 'grayscale' | 'averageColor' | 'colorful' | 'thumbhash'

export type ThumbnailPlaceholderData = {
	averageColor?: string | null
	colors?: ImageColor[] | null
	thumbhash?: string | null
}

type Props = ThumbnailPlaceholderData & {
	// TODO: Don't intake variant, see above TODO
	variant?: ThumbnailPlaceholderVariant
	className?: string
}

const PLACEHOLDER_BASE_CLASSES = 'absolute inset-0 z-10 overflow-hidden'

type GrayscalePlaceholderProps = {
	className?: string
}

function GrayscalePlaceholder({ className }: GrayscalePlaceholderProps) {
	// TODO(thumbs): Use thumbnail.placeholder color from theme
	return <div className={cn(PLACEHOLDER_BASE_CLASSES, 'bg-sidebar', className)} />
}

export function ThumbnailPlaceholder({
	averageColor,
	colors,
	thumbhash,
	variant = 'grayscale',
	className,
}: Props) {
	const meshColors = useMemo(() => {
		if (!colors) {
			return null
		}
		return selectMeshColors(colors)
	}, [colors])

	const gradientStyle = useMemo(() => {
		if (!meshColors || meshColors.length < 3) {
			return null
		}

		// Note: This was an approximation of what the mobile app has but with CSS
		return {
			background: `
				radial-gradient(ellipse at 0% 0%, ${meshColors[0]} 0%, transparent 50%),
				radial-gradient(ellipse at 100% 0%, ${meshColors[0]} 0%, transparent 50%),
				radial-gradient(ellipse at 50% 50%, ${meshColors[1]} 0%, transparent 60%),
				radial-gradient(ellipse at 0% 100%, ${meshColors[2]} 0%, transparent 50%),
				radial-gradient(ellipse at 100% 100%, ${meshColors[2]} 0%, transparent 50%),
				linear-gradient(to bottom, ${meshColors[0]}, ${meshColors[1]}, ${meshColors[2]})
			`,
		}
	}, [meshColors])

	const thumbHashDataUrl = useMemo(() => {
		if (!thumbhash) {
			return null
		}

		try {
			const thumbHashBinary = Uint8Array.from(atob(thumbhash), (c) => c.charCodeAt(0))
			return thumbHashToDataURL(thumbHashBinary)
		} catch {
			return null
		}
	}, [thumbhash])

	if (variant === 'grayscale') {
		return <GrayscalePlaceholder className={className} />
	}

	if (variant === 'averageColor' && averageColor) {
		return (
			<div
				className={cn(PLACEHOLDER_BASE_CLASSES, className)}
				style={{ backgroundColor: averageColor }}
			/>
		)
	}

	if (variant === 'colorful' && gradientStyle) {
		return <div className={cn(PLACEHOLDER_BASE_CLASSES, className)} style={gradientStyle} />
	}

	if (variant === 'thumbhash' && thumbHashDataUrl) {
		return (
			<img
				src={thumbHashDataUrl}
				className={cn(PLACEHOLDER_BASE_CLASSES, 'h-full w-full object-cover', className)}
				alt=""
			/>
		)
	}

	return <GrayscalePlaceholder className={className} />
}
