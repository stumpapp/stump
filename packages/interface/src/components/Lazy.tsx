import nprogress from 'nprogress'
import { useEffect } from 'react'

export default function Lazy() {
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
