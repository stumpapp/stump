import { useEffect, useRef, useState } from 'react'

export default function useIsInView<T extends Element | null>(
	rootMargin = '0px',
): [React.MutableRefObject<T | null>, boolean] {
	const ref = useRef<T>(null)

	const [isIntersecting, setIntersecting] = useState(false)

	useEffect(() => {
		const observer = new IntersectionObserver(
			([entry]) => setIntersecting(entry?.isIntersecting || false),
			{
				rootMargin,
			},
		)

		if (ref.current) {
			observer.observe(ref.current)
		}
		return () => {
			observer.disconnect()
		}
	}, [rootMargin])

	return [ref, isIntersecting]
}
