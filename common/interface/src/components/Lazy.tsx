import nprogress from 'nprogress';
import { useEffect } from 'react';

export default function Lazy() {
	useEffect(() => {
		// @ts-ignore: FIXME:
		let timeout: NodeJS.Timeout;
		// loader doesn't need to start immediately, if it only takes 100ms to load i'd rather
		// not show it at all than a quick flash
		timeout = setTimeout(() => nprogress.start(), 100);

		return () => {
			clearTimeout(timeout);
			nprogress.done();
		};
	});

	return null;
}
