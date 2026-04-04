import { useSDK } from '@stump/client'
import { Book } from 'lucide-react'
import { useState } from 'react'

import { EntityImage } from '@/components/entity'
import { usePreferences } from '@/hooks/usePreferences'

type Props = {
	/**
	 * The ID of the series
	 */
	id: string
	/**
	 * The title for the image
	 */
	title?: string
}

export default function CoverImageCell({ id, title }: Props) {
	const { sdk } = useSDK()
	const {
		preferences: { thumbnailRatio },
	} = usePreferences()
	const [showFallback, setShowFallback] = useState(false)

	const loadImage = () => {
		const image = new Image()
		return new Promise((resolve, reject) => {
			image.src = sdk.series.thumbnailURL(id)
			image.onload = () => resolve(image)
			image.onerror = (e) => {
				console.error('Image failed to load:', e)
				reject(new Error('Could not load image'))
			}
		})
	}

	const attemptReload = async () => {
		try {
			await loadImage()
			setShowFallback(false)
		} catch {
			setShowFallback(true)
		}
	}

	if (showFallback) {
		return (
			<div
				title={`${title} (Image failed to load)`}
				className="h-14 rounded-sm shadow-sm flex w-auto items-center justify-center border-[0.5px] border-edge bg-sidebar"
				style={{ aspectRatio: thumbnailRatio }}
				onClick={attemptReload}
			>
				<Book className="h-8 w-8 text-foreground-muted" />
			</div>
		)
	}

	return (
		<EntityImage
			title={title}
			className="h-14 rounded-sm w-auto object-cover"
			style={{ aspectRatio: thumbnailRatio }}
			src={sdk.series.thumbnailURL(id)}
			onError={() => setShowFallback(true)}
		/>
	)
}
