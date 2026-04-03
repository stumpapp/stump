import nprogress from 'nprogress'
import { useEffect } from 'react'

import { useAppStore } from '@/stores'

/**
 * Renders a loading bar at the very top of the screen when a route is loading.
 * This is used as a Suspense fallback, and should really only be used as such.
 */
export default function RouteLoadingIndicator() {
	const platform = useAppStore((store) => store.platform)

	useEffect(() => {
		// when not browser (i.e., desktop) the custom titlebar is at top and we want nprogress to be below it
		// i am being lazy and just mutating the css variable here
		if (platform !== 'browser') {
			const root = document.documentElement
			// h-9 -> 36px + 1px border
			root.style.setProperty('--nprogress-bar-top', '37px')
		} else {
			const root = document.documentElement
			root.style.setProperty('--nprogress-bar-top', '0px')
		}
	}, [platform])

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
