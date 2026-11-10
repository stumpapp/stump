import { useLayoutEffect, useRef, useState } from 'react'

// px-1.5 on each side of a card
export const CARD_HORIZONTAL_PADDING = 12
export const CARD_ROW_GAP = 12

/**
 * measures the container and reports how many cards of `cardWidth` fit across it
 */
export function useFittedColumns(cardWidth: number) {
	const containerRef = useRef<HTMLDivElement>(null)

	const [containerWidth, setContainerWidth] = useState(0)

	useLayoutEffect(() => {
		const container = containerRef.current
		if (!container) return

		const updateWidth = () => setContainerWidth(container.clientWidth)
		const observer = new ResizeObserver(updateWidth)
		observer.observe(container)
		updateWidth()

		return () => observer.disconnect()
	}, [])

	const columnsThatFit = Math.max(
		1,
		Math.floor(containerWidth / (cardWidth + CARD_HORIZONTAL_PADDING)),
	)

	return { containerRef, containerWidth, columnsThatFit, isMeasured: containerWidth > 0 }
}
