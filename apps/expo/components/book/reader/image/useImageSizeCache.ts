import { useSDK } from '@stump/client'
import { ReadingDirection } from '@stump/graphql'
import sizeOf from 'image-size'
import { useEffect } from 'react'

import { useBookPreferences } from '~/stores/reader'

import { useImageBasedReader } from './context'

type Params = {
	windowSize?: number
}

// TODO: probably write this to disk so we don't need to refetch every time

export function useImageSizeCache({ windowSize = 10 }: Params = {}) {
	const { currentPage = 1, pageURL, book, imageSizes, setImageSizes } = useImageBasedReader()
	const { sdk } = useSDK()
	const {
		preferences: { readingDirection },
	} = useBookPreferences({ book })

	const actualPage =
		readingDirection === ReadingDirection.Rtl ? book.pages - currentPage : currentPage

	useEffect(() => {
		const fetchPages = async (params: { url: string; index: number }[]) => {
			const responses = await Promise.all(
				params.map(({ url, index }) =>
					sdk.axios
						.get(url, {
							responseType: 'arraybuffer',
						})
						.then((response) => ({
							response,
							index,
						})),
				),
			)

			for (let i = 0; i < responses.length; i++) {
				const { response, index } = responses[i]
				try {
					const dimensions = sizeOf(Buffer.from(response.data))
					const ratio = dimensions.width / dimensions.height
					setImageSizes((prev) => {
						const newSizes = [...prev]
						newSizes[index] = {
							height: dimensions.height,
							width: dimensions.width,
							ratio,
						}
						return newSizes
					})
				} catch (e) {
					console.error('Failed to determine size of buffer', e)
				}
			}
		}

		const start = Math.max(0, actualPage - windowSize)
		const end = Math.min(pages, actualPage + windowSize)
		const sizes = imageSizes?.slice(start, end) || []
		const allAlreadyLoaded = sizes.every(Boolean)
		if (allAlreadyLoaded) {
			console.log('allAlreadyLoaded')
			return
		}

		const fetchParams = Array.from({ length: end - start }, (_, i) => i)
			.filter((i) => !sizes[i])
			.map((i) => ({
				url: pageURL(i + start),
				index: i,
			}))

		fetchPages(fetchParams)
	}, [actualPage, imageSizes, pageURL, sdk, setImageSizes, pages, windowSize])
}
