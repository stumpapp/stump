import { getMediaThumbnail } from '@stump/api'
import { Book } from 'lucide-react'
import React, { useState } from 'react'

type Props = {
	id: string
	title?: string
}
export default function CoverImageCell({ id, title }: Props) {
	const [showFallback, setShowFallback] = useState(false)

	const loadImage = () => {
		const image = new Image()
		return new Promise((resolve, reject) => {
			image.src = getMediaThumbnail(id)
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
		} catch (e) {
			setShowFallback(true)
		}
	}

	if (showFallback) {
		return (
			<div
				title={`${title} (Image failed to load)`}
				className="flex aspect-[2/3] h-14 w-auto items-center justify-center rounded-sm border-[0.5px] border-edge bg-sidebar shadow-sm"
				onClick={attemptReload}
			>
				<Book className="h-8 w-8 text-foreground-muted" />
			</div>
		)
	}

	return (
		<img
			title={title}
			className="aspect-[2/3] h-14 w-auto rounded-sm object-cover"
			src={getMediaThumbnail(id)}
			onError={() => setShowFallback(true)}
		/>
	)
}
