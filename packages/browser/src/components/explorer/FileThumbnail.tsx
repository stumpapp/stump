import { queryClient, useSDK } from '@stump/client'
import { cn } from '@stump/components'
import { graphql, MediaAtPathQuery } from '@stump/graphql'
import { Api } from '@stump/sdk'
import { Book, Folder } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

import { usePreferences } from '@/hooks/usePreferences'

import { EntityImage } from '../entity'

type Props = {
	path: string
	isDirectory: boolean
	size?: 'sm' | 'md'
	containerClassName?: string
}

export default function FileThumbnail({
	path,
	isDirectory,
	size = 'sm',
	containerClassName,
}: Props) {
	const { sdk } = useSDK()
	const {
		preferences: { thumbnailRatio },
	} = usePreferences()
	/**
	 * A boolean state to keep track of whether or not we should show the fallback icon. This
	 * will be set to true if the image fails to load
	 */
	const [showFallback, setShowFallback] = useState(false)
	/**
	 * The book associated with the file, if any exists
	 */
	const [book, setBook] = useState<MediaAtPath>(null)
	/**
	 * A naive ref to keep track of whether or not we have fetched the book
	 */
	const didFetchRef = useRef(false)

	/**
	 * An effect that attempts to fetch the book associated with the file, if any exists.
	 * This will only run once, and only if the file is not a directory
	 */
	useEffect(() => {
		if (!book && !didFetchRef.current && !isDirectory) {
			didFetchRef.current = true
			getBook(path, sdk).then(setBook)
		}
	}, [book, path, isDirectory, sdk])

	/**
	 * A function that attempts to load the image associated with the book,
	 * returning a promise that resolves with the image if it loads successfully
	 */
	const loadImage = useCallback(() => {
		if (book) {
			const image = new Image()
			return new Promise((resolve, reject) => {
				image.src = book.thumbnail.url
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

	/**
	 * A function that attempts to reload the image
	 */
	const attemptReload = async () => {
		try {
			await loadImage()
			setShowFallback(false)
		} catch {
			setShowFallback(true)
		}
	}

	const sizeClasses = cn('h-14', { 'h-20': size === 'md' })
	const className = cn(
		'flex w-auto items-center justify-center rounded-sm border-[0.5px] border-edge bg-sidebar shadow-sm',
		sizeClasses,
		containerClassName,
	)
	const iconSizes = cn('h-7 w-7', { 'h-8 w-8': size === 'md' })

	if (isDirectory) {
		return (
			<div className={className} style={{ aspectRatio: thumbnailRatio }}>
				<Folder className={cn('text-foreground-muted', iconSizes)} />
			</div>
		)
	}

	if (showFallback || !book) {
		return (
			<div className={className} onClick={attemptReload} style={{ aspectRatio: thumbnailRatio }}>
				<Book className={cn('text-foreground-muted', iconSizes)} />
			</div>
		)
	}

	return (
		<EntityImage
			className={cn('w-auto rounded-sm object-cover', sizeClasses)}
			style={{ aspectRatio: thumbnailRatio }}
			src={sdk.media.thumbnailURL(book.id)}
			onError={() => setShowFallback(true)}
		/>
	)
}

const query = graphql(`
	query MediaAtPath($path: String!) {
		mediaByPath(path: $path) {
			id
			resolvedName
			thumbnail {
				url
			}
		}
	}
`)

export type MediaAtPath = MediaAtPathQuery['mediaByPath']
/**
 * A function that attempts to fetch the book associated with the file, if any exists.
 * The queryClient is used in order to properly cache the result.
 */
export const getBook = async (path: string, sdk: Api) => {
	try {
		const response = await queryClient.fetchQuery({
			queryKey: ['getMediaByPath', path],
			queryFn: async () => {
				return sdk.execute(query, { path })
			},
			// 15 minutes
			staleTime: 1000 * 60 * 15,
		})
		return response.mediaByPath ?? null
	} catch (error) {
		console.error(error)
		return null
	}
}
