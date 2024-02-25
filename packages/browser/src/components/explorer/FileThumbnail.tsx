import { getMediaThumbnail, mediaApi, mediaQueryKeys } from '@stump/api'
import { queryClient } from '@stump/client'
import { Media } from '@stump/types'
import { Book } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

type Props = {
	path: string
}
export default function FileThumbnail({ path }: Props) {
	const [showFallback, setShowFallback] = useState(false)

	const [book, setBook] = useState<Media | null>(null)
	const didFetchRef = useRef(false)

	useEffect(() => {
		if (!book && !didFetchRef.current) {
			didFetchRef.current = true
			getBook(path).then(setBook)
		}
	}, [book, path])

	const loadImage = useCallback(() => {
		if (book) {
			const image = new Image()
			return new Promise((resolve, reject) => {
				image.src = getMediaThumbnail(book.id)
				image.onload = () => resolve(image)
				image.onerror = (e) => {
					console.error('Image failed to load:', e)
					reject(new Error('Could not load image'))
				}
			})
		} else {
			return Promise.reject('No book found')
		}
	}, [book])

	const attemptReload = async () => {
		try {
			await loadImage()
			setShowFallback(false)
		} catch (e) {
			setShowFallback(true)
		}
	}

	if (showFallback || !book) {
		return (
			<div
				// title={`${title} (Image failed to load)`}
				className="flex aspect-[2/3] h-14 w-auto items-center justify-center rounded-sm border-[0.5px] border-edge bg-sidebar shadow-sm"
				onClick={attemptReload}
			>
				<Book className="h-8 w-8 text-muted" />
			</div>
		)
	}

	return (
		<img
			// title={title}
			className="aspect-[2/3] h-14 w-auto rounded-sm object-cover"
			src={getMediaThumbnail(book.id)}
			onError={() => setShowFallback(true)}
		/>
	)
}

const getBook = async (path: string) => {
	try {
		const response = await queryClient.fetchQuery([mediaQueryKeys.getMedia, { path }], () =>
			mediaApi.getMedia({
				path,
			}),
		)
		return response.data.data?.at(0) ?? null
	} catch (error) {
		console.error(error)
		return null
	}
}
