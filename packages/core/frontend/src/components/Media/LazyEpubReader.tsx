import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Book, Rendition } from 'epubjs';
import { baseURL } from '~api/index';
import { useColorMode } from '@chakra-ui/react';
import toast from 'react-hot-toast';
import EpubControls from './Epub/EpubControls';
import { useQuery } from 'react-query';
import { getMediaById } from '~api/query/media';

// Color manipulation reference: https://github.com/futurepress/epub.js/issues/1019

/**

looks like epubcfi generates the first two elements of the cfi like /6/{(index+1) * 2} (indexing non-zero based):
	- index 1 /6/2, index=2 /6/4, index=3 /6/8 etc.

can't figure out rest yet -> https://www.heliconbooks.com/?id=blog&postid=EPUB3Links
*/

interface LazyEpubReaderProps {
	id: string;
	loc: string | null;
}

// TODO: https://github.com/FormidableLabs/react-swipeable#how-to-share-ref-from-useswipeable

export default function LazyEpubReader({ id, loc }: LazyEpubReaderProps) {
	const { colorMode } = useColorMode();

	const ref = useRef<any>(null);

	const [book, setBook] = useState<Book | null>(null);
	const [rendition, setRendition] = useState<Rendition | null>(null);

	const [location, setLocation] = useState<any>({ epubcfi: loc });

	const { data: epub, isLoading } = useQuery(['getMediaById', id], {
		queryFn: async () => getMediaById(id).then((res) => res.data),
	});

	// TODO: type me
	function handleLocationChange(newLocation: any) {
		console.log(newLocation);
		setLocation({
			// @ts-ignore: types are wrong >:(
			epubcfi: newLocation?.start?.cfi ?? null,
			// @ts-ignore: types are wrong >:(
			page: newLocation?.start?.displayed?.page,
			// @ts-ignore: types are wrong >:(
			total: newLocation?.start?.displayed?.total,
			href: newLocation?.start?.href,
		});
	}

	const chapter = useMemo(() => {
		if (!book || !location.href) {
			return null;
		}

		const bookNavigation = book.navigation.toc.filter((item) => item.href === location.href);

		console.log(book);

		console.log(bookNavigation);

		return bookNavigation[0]?.label.trim();
	}, [book, location]);

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
				const defaultLoc = book.rendition?.location?.start?.cfi;

				const rendition_ = book.renderTo(ref.current, {
					width: '100%',
					height: '100%',
				});

				// TODO more styles, probably separate this out
				rendition_.themes.register('dark', {
					body: { background: '#212836' },
					p: { color: '#E8EDF4' },
				});

				rendition_.on('relocated', handleLocationChange);

				if (colorMode === 'dark') {
					rendition_.themes.select('dark');
				}

				setRendition(rendition_);

				// Note: this *does* work, returns epubcfi. I might consider this...
				// console.log(book.spine.get('chapter001.xhtml'));

				if (location?.epubcfi) {
					rendition_.display(location.epubcfi);
				} else if (defaultLoc) {
					rendition_.display(defaultLoc);
				} else {
					rendition_.display();
				}
			}
		});
	}, [book]);

	useEffect(() => {
		if (!rendition) {
			return;
		}

		if (colorMode === 'dark') {
			rendition.themes.select('dark');
		} else {
			rendition.themes.select('default');
		}
	}, [rendition, colorMode]);

	// epubcfi(/6/10!/4/2/2[Chapter1]/48/1:0)

	// I hate this...
	const controls = useMemo(
		() => ({
			async next() {
				if (rendition) {
					await rendition.next().catch((err) => {
						console.error(err);
						toast.error('Something went wrong!');
					});
				}
			},

			async prev() {
				if (rendition) {
					await rendition.prev().catch((err) => {
						console.error(err);
						toast.error('Something went wrong!');
					});
				}
			},

			changeFontSize(size: string) {
				if (rendition) {
					rendition.themes.fontSize(size);
				}
			},
		}),
		[rendition],
	);

	if (isLoading) {
		return <div>Loading TODO.....</div>;
	}

	return (
		// TODO: fix type here
		<EpubControls controls={controls} location={{ ...location, chapter }} media={epub!}>
			<div className="h-full w-full" ref={ref} />
		</EpubControls>
	);
}
