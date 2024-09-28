import { useEffect, useRef, useState } from 'react'

type Params = {
	extraOffset?: number
	selector?: string
}

export function useSticky<T extends HTMLElement>({
	extraOffset = 0,
	selector = ARTIFICIAL_SCROLL_SELECTOR,
}: Params = {}) {
	const stickyRef = useRef<T>(null)
	const scrollRef = useRef<HTMLElement | null>(null)

	const [sticky, setSticky] = useState(false)

	const isRefSet = !!stickyRef.current
	useEffect(() => {
		const doObserve = () => {
			if (!stickyRef.current) return

			const refPageOffset = stickyRef.current.getBoundingClientRect().top
			const stickyOffset = parseInt(getComputedStyle(stickyRef.current).top)
			const stickyActive = refPageOffset <= stickyOffset + extraOffset

			if (stickyActive && !sticky) {
				setSticky(true)
			} else if (!stickyActive && sticky) {
				setSticky(false)
			}
		}
		doObserve()

		const scrollEl = document.querySelector(selector) as HTMLElement | null
		scrollRef.current = scrollEl

		if (!scrollRef.current) return

		scrollRef.current.addEventListener('scroll', doObserve)
		window.addEventListener('resize', doObserve)
		window.addEventListener('orientationchange', doObserve)

		return () => {
			scrollEl?.removeEventListener('scroll', doObserve)
			window.removeEventListener('resize', doObserve)
			window.removeEventListener('orientationchange', doObserve)
		}
	}, [sticky, extraOffset, isRefSet, selector])

	return {
		isSticky: sticky,
		ref: stickyRef,
	}
}

export const ARTIFICIAL_SCROLL_SELECTOR = '[data-artificial-scroll="true"]'
