import {
	ARCHIVE_EXTENSION,
	EBOOK_EXTENSION,
	PDF_EXTENSION,
	queryClient,
	useSDK,
} from '@stump/client'
import { cn } from '@stump/components'
import { graphql, MediaAtPathQuery } from '@stump/graphql'
import { Api } from '@stump/sdk'
import { useEffect, useRef, useState } from 'react'

import { usePreferences } from '@/hooks/usePreferences'
import { useTheme } from '@/hooks/useTheme'

import { EntityImage } from '../entity'

type Props = {
	path: string
	isDirectory: boolean
	thumbSize?: number
	containerClassName?: string
}

function getIconSrc(path: string, isDirectory: boolean, isDark: boolean): string {
	if (isDirectory) {
		return isDark ? '/assets/icons/Folder.png' : '/assets/icons/Folder_Light.png'
	}

	const ext = path.split('.').pop()?.toLowerCase() ?? ''

	if (ARCHIVE_EXTENSION.test(ext) || EBOOK_EXTENSION.test(ext)) {
		return isDark ? '/assets/icons/Archive.png' : '/assets/icons/Archive_Light.png'
	} else if (PDF_EXTENSION.test(ext)) {
		return isDark ? '/assets/icons/Document_pdf.png' : '/assets/icons/Document_pdf_Light.png'
	} else {
		return isDark ? '/assets/icons/Document.png' : '/assets/icons/Document_Light.png'
	}
}

export default function FileThumbnail({ path, isDirectory, thumbSize, containerClassName }: Props) {
	const { sdk } = useSDK()
	const {
		preferences: { thumbnailRatio },
	} = usePreferences()
	const { isDarkVariant } = useTheme()

	const [showFallback, setShowFallback] = useState(false)
	const [book, setBook] = useState<MediaAtPath>(null)

	const didFetchRef = useRef(false)

	useEffect(() => {
		if (!book && !didFetchRef.current && !isDirectory) {
			didFetchRef.current = true
			getBook(path, sdk).then(setBook)
		}
	}, [book, path, isDirectory, sdk])

	const iconSrc = getIconSrc(path, isDirectory, isDarkVariant)

	if (thumbSize != undefined) {
		if (isDirectory || showFallback || !book) {
			return (
				<div
					className={cn('relative flex shrink-0 items-center justify-center', containerClassName)}
					style={{ width: thumbSize, height: thumbSize, minWidth: thumbSize, minHeight: thumbSize }}
					onClick={showFallback ? () => setShowFallback(false) : undefined}
				>
					<img
						src={iconSrc}
						style={{ width: thumbSize, height: thumbSize }}
						className="object-contain"
						alt=""
					/>
				</div>
			)
		}
		return (
			<div
				className={cn('relative flex shrink-0 items-center justify-center', containerClassName)}
				style={{ width: thumbSize, height: thumbSize, minWidth: thumbSize, minHeight: thumbSize }}
			>
				<EntityImage
					className="max-h-full max-w-full rounded-sm object-contain"
					src={sdk.media.thumbnailURL(book.id)}
					onError={() => setShowFallback(true)}
				/>
			</div>
		)
	}

	if (isDirectory || showFallback || !book) {
		return (
			<div
				className={cn('flex items-center justify-center', containerClassName)}
				style={{ aspectRatio: thumbnailRatio }}
			>
				<img src={iconSrc} className="h-full w-full object-contain" alt="" />
			</div>
		)
	}
	return (
		<EntityImage
			className={cn('h-full w-auto rounded-sm object-cover', containerClassName)}
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
