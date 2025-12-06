import { useEffect, useState } from 'react'

export function useScrollElement(ref: React.RefObject<HTMLDivElement | null>) {
	const [scrollElement, setScrollElement] = useState<HTMLElement | null>(null)

	useEffect(() => {
		const findScrollElement = () => {
			if (!ref.current) return

			let parent = ref.current.parentElement
			while (parent) {
				// Check for OverlayScrollbars viewport
				if (parent.classList.contains('os-viewport')) {
					setScrollElement(parent)
					return
				}

				// Check for generic scrollable element
				const { overflowY } = window.getComputedStyle(parent)
				if (overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay') {
					setScrollElement(parent)
					return
				}
				parent = parent.parentElement
			}

			// Fallback to main which should always be scrollable
			setScrollElement(document.getElementById('main'))
		}

		findScrollElement()
		// Retry in case OverlayScrollbars initializes later, I noticed some
		// inconsistencies. I generally don't like this pattern tho
		const timeout = setTimeout(findScrollElement, 100)
		return () => clearTimeout(timeout)
	}, [ref])

	return scrollElement
}
