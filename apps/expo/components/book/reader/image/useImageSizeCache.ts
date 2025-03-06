import { useEffect } from 'react'

import { useBookPreferences } from '~/stores/reader'

import { useImageBasedReader } from './context'

type Params = {
	windowSize?: number
}

// TODO: probably write this to disk so we don't need to refetch every time

export function useImageSizeCache({ windowSize = 10 }: Params = {}) {
	const {
		currentPage = 1,
		pageURL,
		book: { id, pages },
		imageSizes,
		setImageSizes,
	} = useImageBasedReader()
	const {
		preferences: { readingDirection },
	} = useBookPreferences(id)

	const actualPage = readingDirection === 'rtl' ? pages - currentPage : currentPage

	useEffect(() => {
		const start = Math.max(0, actualPage - windowSize)
		const end = Math.min(pages, actualPage + windowSize)
		const sizes = imageSizes?.slice(start, end) || []
		const allAlreadyLoaded = sizes.every(Boolean)
		if (!allAlreadyLoaded) {
			return
		}

		const urls = Array.from({ length: end - start }, (_, i) => i)
			.filter((i) => !sizes[i])
			.map((i) => pageURL(start + i))
	}, [])
}
