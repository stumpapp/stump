import { useEffect, useState } from 'react'

import { useReaderStore } from '~/stores'

import { ImageBasedBookPageRef } from './context'

type Params = {
	bookID: string
	imageSizes?: Record<number, ImageBasedBookPageRef>
}

export function useDimensions({ bookID, imageSizes }: Params) {
	const booksCache = useReaderStore((store) => store.bookCache)
	const setBookCache = useReaderStore((store) => store.setBookCache)

	const bookCache = booksCache[bookID]

	const [sizes, setSizes] = useState<Record<number, ImageBasedBookPageRef>>(
		imageSizes ? imageSizes : bookCache?.dimensions || {},
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
