import { useEffect, useState } from 'react';

// yoink https://usehooks-ts.com/react-hook/use-media-query

export function useMediaQuery(query: string): boolean {
	const getMatches = (queryString: string): boolean => {
		if (typeof window !== 'undefined') {
			return window.matchMedia(queryString).matches;
		}

		return false;
	};

	const [matches, setMatches] = useState<boolean>(getMatches(query));

	function handleChange() {
		setMatches(getMatches(query));
	}

	useEffect(() => {
		const matchMedia = window.matchMedia(query);

		handleChange();

		if (matchMedia.addListener) {
			matchMedia.addListener(handleChange);
		} else {
			matchMedia.addEventListener('change', handleChange);
		}

		return () => {
			if (matchMedia.removeListener) {
				matchMedia.removeListener(handleChange);
			} else {
				matchMedia.removeEventListener('change', handleChange);
			}
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [query]);

	return matches;
}
