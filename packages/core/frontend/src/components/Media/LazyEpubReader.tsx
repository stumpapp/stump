import React, { useEffect, useRef, useState } from 'react';

import { Book, Rendition } from 'epubjs';
import { baseURL } from '~api/index';

// Color manipulation reference: https://github.com/futurepress/epub.js/issues/1019

/**

looks like epubcfi generates the first two elements of the cfi like /6/{(index+1) * 2} (indexing non-zero based):
	- index 1 /6/2, index=2 /6/4, index=3 /6/8 etc.

can't figure out rest yet -> https://www.heliconbooks.com/?id=blog&postid=EPUB3Links

*/

interface LazyEpubReaderProps {
	id: string;
}

export default function LazyEpubReader({ id }: LazyEpubReaderProps) {
	const ref = useRef<any>(null);

	const [book, setBook] = useState<Book | null>(null);

	const [rendition, setRendition] = useState<Rendition | null>(null);

	const [isLoaded, setIsLoaded] = useState(false);

	useEffect(() => {
		if (!ref.current) return;

		if (!book) {
			setBook(
				new Book(`${baseURL}/media/${id}/file`, {
					openAs: 'epub',
				}),
			);
		}
	}, [ref]);

	useEffect(() => {
		if (!book) return;

		book.ready.then(() => {
			if (book.spine) {
				const loc = book.rendition?.location?.start?.cfi;

				const rendition_ = book.renderTo(ref.current, {
					width: '100%',
					height: '100%',
					// ...epubOptions
				});

				setRendition(rendition_);

				if (loc) {
					rendition_.display(loc);
				} else {
					rendition_.display();
				}
			}
		});
	}, [book]);

	useEffect(() => {
		let interval: NodeJS.Timer;

		if (rendition) {
			interval = setInterval(() => {
				// console.log(rendition?.currentLocation());

				rendition.next();
			}, 2000);
		}

		return () => {
			clearInterval(interval);
		};
	}, [rendition]);

	// console.log({ book, rendition });

	return <div className="w-full h-full" ref={ref} />;
}
