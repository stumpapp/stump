import React, { useEffect, useRef, useState } from 'react';

import { Book, Rendition } from 'epubjs';

export default function EpubReader() {
	const ref = useRef<any>(null);

	const [book, setBook] = useState<Book | null>(null);

	const [rendition, setRendition] = useState<Rendition | null>(null);

	const [isLoaded, setIsLoaded] = useState(false);

	useEffect(() => {
		if (!ref.current) return;

		if (!book) {
			setBook(
				new Book('http://localhost:10801/api/media/35a5302d-ad48-4df9-9df7-9c20cc77e6ee/file', {
					openAs: 'epub',
				}),
			);
			// setBook(new Book('https://react-reader.metabits.no/files/alice.epub', {}));
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

	// useEffect(() => {
	// 	let interval: NodeJS.Timer;

	// 	if (rendition) {
	// 		interval = setInterval(() => {
	// 			rendition.next();
	// 		}, 1000);
	// 	}

	// 	return () => {
	// 		clearInterval(interval);
	// 	};
	// }, [rendition]);

	// console.log({ book, rendition });

	return <div className="w-full h-full" ref={ref} />;
}
