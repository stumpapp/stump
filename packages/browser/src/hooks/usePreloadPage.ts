import { usePrevious } from '@stump/components'
import { useEffect, useState } from 'react'

type Params = {
	pages: number[]
	urlBuilder: (page: number) => string
}
/**
 * A hook to preload a list of pages, provided a function to build the url for each page
 *
 * TODO: handle errors a bit better?
 */
export function usePreloadPage({ pages, urlBuilder }: Params) {
	const [isPreloading, setIsPreloading] = useState(false)

	const previousPages = usePrevious(pages)
	const shouldPreload = previousPages?.at(0) !== pages.at(0)

	/**
	 * This effect will attempt to preload all pages by creating an image element
	 * for each page and setting the src to the urlBuilder function.
	 *
	 * It currently does not handle errors, but it could be extended to do so.
	 */
	useEffect(() => {
		if (!pages.length || !shouldPreload) return

		const preloadPage = (page: number) => {
			const image = new Image()
			return new Promise((resolve, reject) => {
				image.src = urlBuilder(page)
				image.onload = () => resolve(`Page ${page} loaded`)
				image.onerror = (error) => reject(error)
			})
		}

		const preloadPages = async () => {
			setIsPreloading(true)
			const results = await Promise.allSettled(pages.map(preloadPage))
			const errors = results.filter((result) => result.status === 'rejected')
			if (errors.length) {
				console.error(errors)
			}
			setIsPreloading(false)
		}

		preloadPages()
	}, [pages, urlBuilder, shouldPreload])

	return { isPreloading }
}
