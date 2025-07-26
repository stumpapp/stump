import { useEffect, useState } from 'react'

import { useReaderStore } from '~/stores'

import { ImageBasedBookPageRef } from './context'

type Params = {
	bookID: string
	imageSizes?: Record<number, ImageBasedBookPageRef>
}
export function useDimensions({ bookID, imageSizes }: Params) {
	const bookCache = useReaderStore((store) => store.bookCache[bookID] || {})
	const setBookCache = useReaderStore((store) => store.setBookCache)

	const [sizes, setSizes] = useState<Record<number, ImageBasedBookPageRef>>(
		imageSizes ? imageSizes : bookCache.dimensions || {},
	)

	useEffect(() => {
		return () => {
			setBookCache(bookID, {
				dimensions: sizes,
			})
		}
	}, [bookID, sizes, setBookCache])

	return {
		sizes,
		setSizes,
	}
}
