import { useEffect, useState } from 'react'

/**
 * A hook to detect the zoom level of the browser.
 */
export function useDetectZoom() {
	const [zoom, setZoom] = useState<number>()

	useEffect(() => {
		const handleResize = () => {
			setZoom(window.visualViewport?.scale)
		}

		window.visualViewport?.addEventListener('resize', handleResize)
		handleResize()
		return () => window.visualViewport?.removeEventListener('resize', handleResize)
	}, [])

	return {
		isZoomed: zoom !== undefined && zoom > 1,
		ratio: zoom,
	}
}
