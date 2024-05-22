import { useEffect, useRef, useState } from 'react'

type Return<T> = [React.MutableRefObject<T | null>, boolean]

export function useStickyIntersection<T extends Element | null = HTMLDivElement>(): Return<T> {
	const ref = useRef<T>(null)

	const [isPinned, setIsPinned] = useState(false)

	useEffect(() => {
		const observer = new IntersectionObserver(
			([e]) => setIsPinned(e ? e.intersectionRatio < 1 : false),
			{ threshold: [1] },
		)

		if (ref.current) {
			observer.observe(ref.current)
		}
	}, [])

	return [ref, isPinned]
}
