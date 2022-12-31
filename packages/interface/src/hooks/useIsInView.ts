import { useEffect, useRef, useState } from 'react'

export default function useIsInView<T extends Element | undefined>(
	rootMargin = '0px',
): [React.MutableRefObject<T | undefined>, boolean] {
	const ref = useRef<T>()

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
