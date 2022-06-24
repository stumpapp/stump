import { useEffect, useState } from 'react';

export default function useIsInView<T extends Element | undefined>(
	ref: React.MutableRefObject<T>,
	rootMargin = '0px',
) {
	const [isIntersecting, setIntersecting] = useState(false);

	useEffect(() => {
		const observer = new IntersectionObserver(([entry]) => setIntersecting(entry.isIntersecting), {
			rootMargin,
		});

		if (ref.current) {
			observer.observe(ref.current);
		}
		return () => {
			observer.disconnect();
		};
	}, []);

	return isIntersecting;
}
