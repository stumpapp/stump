import { useEffect, useRef, useState } from 'react'

import { ImagePageDimensionRef } from '@/components/readers/image-based/context'

type Params = {
	/**
	 * The pages to preload
	 */
	pages: number[]
	/**
	 * A function to build the url for a given page
	 */
	urlBuilder: (page: number) => string
	/**
	 * A callback to store the dimensions of a page after it has been preloaded
	 */
	onStoreDimensions?: (page: number, dimensions: ImagePageDimensionRef) => void
}
/**
 * A hook to preload a list of pages, provided a function to build the url for each page
 *
 * TODO: handle errors a bit better?
 */
export function usePreloadPage({ pages, urlBuilder, onStoreDimensions }: Params) {
	const [isPreloading, setIsPreloading] = useState(false)

	const preloadRef = useRef<Record<number, boolean>>({})

	/**
	 * This effect will attempt to preload all pages by creating an image element
	 * for each page and setting the src to the urlBuilder function.
	 *
	 * It currently does not handle errors, but it could be extended to do so.
	 */
	useEffect(() => {
		const filteredPages = pages.filter((page) => !preloadRef.current[page])
		const shouldPreload = filteredPages.length > 0

		if (!shouldPreload) return

		filteredPages.forEach((page) => {
			preloadRef.current[page] = true
		})

		const preloadPage = (page: number) => {
			const image = new Image()
			return new Promise((resolve, reject) => {
				image.src = urlBuilder(page)
				image.onload = () => {
					if (image.width && image.height) {
						onStoreDimensions?.(page, {
							height: image.height,
							isPortrait: image.height > image.width,
							width: image.width,
						})
					}
					resolve(image)
				}
				image.onerror = (error) => reject(error)
			})
		}

		const preloadPages = async () => {
			setIsPreloading(true)
			const results = await Promise.allSettled(filteredPages.map(preloadPage))
			const errors = results.filter((result) => result.status === 'rejected')
			if (errors.length) {
				console.error(errors)
			}
			setIsPreloading(false)
		}

		preloadPages()
	}, [pages, urlBuilder, onStoreDimensions])

	return { isPreloading }
}
