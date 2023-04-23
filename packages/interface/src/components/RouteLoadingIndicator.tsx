import nprogress from 'nprogress'
import { useEffect } from 'react'

/**
 * Renders a loading bar at the very top of the screen when a route is loading.
 * This is used as a Suspense fallback, and should really only be used as such.
 */
export default function RouteLoadingIndicator() {
	useEffect(() => {
		let timeout: NodeJS.Timeout
		// loader doesn't need to start immediately, if it only takes 100ms to load i'd rather
		// not show it at all than a quick flash
		// eslint-disable-next-line prefer-const
		timeout = setTimeout(() => nprogress.start(), 100)

		return () => {
			clearTimeout(timeout)
			nprogress.done()
		}
	})

	return null
}
