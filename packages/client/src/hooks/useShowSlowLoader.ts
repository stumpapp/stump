import { useEffect, useRef, useState } from 'react'

/**
 * A hook that returns a boolean indicating whether to show a loading state based on
 * a delay. This is used to surface some kind of loading state if the connection is slow
 * without always showing a loader for fast connections (which looks ugly and stinky)
 *
 * @param isLoading The current loading state
 * @param delay The time before showing a loading state
 */
export function useShowSlowLoader(isLoading: boolean, delay = 600) {
	const [showLoader, setShowLoader] = useState(false)
	const timeoutRef = useRef<NodeJS.Timeout | null>(null)

	useEffect(() => {
		if (isLoading) {
			timeoutRef.current = setTimeout(() => {
				setShowLoader(true)
			}, delay)
		} else {
			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current)
				timeoutRef.current = null
			}
			setShowLoader(false)
		}

		return () => {
			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current)
			}
		}
	}, [isLoading, delay])

	return showLoader
}
