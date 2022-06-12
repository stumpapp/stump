import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Book, Rendition } from 'epubjs';
import { baseURL } from '~api/index';
import { useColorMode } from '@chakra-ui/react';
import toast from 'react-hot-toast';
import EpubControls from './Epub/EpubControls';
import { useSwipeable } from 'react-swipeable';
import { useQuery } from 'react-query';
import { getMediaById } from '~api/query/media';
import { epubDarkTheme } from '~util/epubTheme';

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

	const ref = useRef<HTMLDivElement>(null);

	const [book, setBook] = useState<Book | null>(null);
	const [rendition, setRendition] = useState<Rendition | null>(null);

	const [location, setLocation] = useState<any>({ epubcfi: loc });
	const [chapter, setChapter] = useState<string>('');

	const { data: epub, isLoading } = useQuery(['getMediaById', id], {
		queryFn: async () => getMediaById(id).then((res) => res.data),
	});

	// TODO: type me

	function handleLocationChange(changeState: any) {
		const start = changeState?.start;

		console.log({ changeState, start });
		if (!start) {
			return;
		}

		const newChapter = controls.getChapter(start.href);

		if (newChapter) {
			setChapter(newChapter);
		}

		setLocation({
			// @ts-ignore: types are wrong >:(
			epubcfi: start.cfi ?? null,
			// @ts-ignore: types are wrong >:(
			page: start.displayed?.page,
			// @ts-ignore: types are wrong >:(
			total: start.displayed?.total,
			href: start.href,
			index: start.index,
		});
	}

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
		if (!ref.current) return;

		book.ready.then(() => {
			if (book.spine) {
				const defaultLoc = book.rendition?.location?.start?.cfi;

				const rendition_ = book.renderTo(ref.current!, {
					width: '100%',
					height: '100%',
				});

				// TODO more styles, probably separate this out
				rendition_.themes.register('dark', epubDarkTheme);

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

			// Note: some books have entries in the spine for each href, some don't. This means for some
			// books the chapter will be null after the first page of that chapter. This function is
			// used to get the current chapter, which will only work, in some cases, on the first page
			// of the chapter. The chapter state will only get updated when this function returns a non-null
			// value.
			getChapter(href: string): string | null {
				if (book) {
					const filteredToc = book.navigation.toc.filter((toc) => toc.href === href);

					return filteredToc[0]?.label.trim() ?? null;
				}

				return null;
			},

			changeFontSize(size: string) {
				if (rendition) {
					rendition.themes.fontSize(size);
				}
			},
		}),
		[rendition, book],
	);

	const swipeHandlers = useSwipeable({
		onSwipedRight: controls.prev,
		onSwipedLeft: controls.next,
		// onTap: ({ event }) => {
		// 	console.log(event);
		// },
		preventScrollOnSwipe: true,
	});

	if (isLoading) {
		return <div>Loading TODO.....</div>;
	}

	return (
		<EpubControls
			controls={controls}
			swipeHandlers={swipeHandlers}
			location={{ ...location, chapter }}
			media={epub!}
		>
			<div className="h-full w-full" ref={ref} />
		</EpubControls>
	);
}
