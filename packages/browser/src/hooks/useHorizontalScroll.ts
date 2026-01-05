import { useCallback, useEffect, useRef, useState } from 'react'

type UseHorizontalScrollOptions = {
	/**
	 * As a percentage of the container width
	 **/
	scrollAmount?: number
}

type Return = {
	scrollerRef: (ref: HTMLElement | Window | null) => void
	canSkipBackward: boolean
	canSkipForward: boolean
	handleSkipBackward: () => void
	handleSkipAhead: () => void
}

export function useHorizontalScroll(options: UseHorizontalScrollOptions = {}): Return {
	const { scrollAmount = 0.6 } = options

	const elementRef = useRef<HTMLDivElement | null>(null)
	const resizeObserverRef = useRef<ResizeObserver | null>(null)
	const [canSkipBackward, setCanSkipBackward] = useState(false)
	const [canSkipForward, setCanSkipForward] = useState(false)

	const updateScrollState = useCallback(() => {
		const el = elementRef.current
		if (!el) return
		const { scrollLeft, scrollWidth, clientWidth } = el
		setCanSkipBackward(scrollLeft > 0)
		setCanSkipForward(scrollLeft < scrollWidth - clientWidth - 1)
	}, [])

	const scrollerRef = useCallback(
		(ref: HTMLElement | Window | null) => {
			if (elementRef.current) {
				elementRef.current.removeEventListener('scroll', updateScrollState)
			}

			if (resizeObserverRef.current) {
				resizeObserverRef.current.disconnect()
				resizeObserverRef.current = null
			}

			// Note: This hook is really only intended for Virtuoso scrollers, and this
			// type check is because the `scrollerRef` can be a Window. We don't care
			// about that case here.
			if (ref instanceof HTMLDivElement) {
				elementRef.current = ref
				ref.addEventListener('scroll', updateScrollState)

				resizeObserverRef.current = new ResizeObserver(() => {
					updateScrollState()
				})
				resizeObserverRef.current.observe(ref)

				updateScrollState()
			} else {
				elementRef.current = null
			}
		},
		[updateScrollState],
	)

	useEffect(() => {
		return () => {
			if (elementRef.current) {
				elementRef.current.removeEventListener('scroll', updateScrollState)
			}

			if (resizeObserverRef.current) {
				resizeObserverRef.current.disconnect()
			}
		}
	}, [updateScrollState])

	const handleSkipAhead = useCallback(() => {
		if (!elementRef.current) return
		const amount = elementRef.current.clientWidth * scrollAmount
		elementRef.current.scrollBy({ left: amount, behavior: 'smooth' })
	}, [scrollAmount])

	const handleSkipBackward = useCallback(() => {
		if (!elementRef.current) return
		const amount = elementRef.current.clientWidth * scrollAmount
		elementRef.current.scrollBy({ left: -amount, behavior: 'smooth' })
	}, [scrollAmount])

	return {
		scrollerRef,
		canSkipBackward,
		canSkipForward,
		handleSkipBackward,
		handleSkipAhead,
	}
}
