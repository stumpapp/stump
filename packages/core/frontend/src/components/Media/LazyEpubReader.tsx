import React, { useEffect, useMemo, useRef, useState } from 'react';

import { Book, Rendition } from 'epubjs';
import { baseURL } from '~api/index';
import { Button, HStack, useBoolean, useColorMode, useColorModeValue } from '@chakra-ui/react';
import toast from 'react-hot-toast';
import { CaretLeft, CaretRight } from 'phosphor-react';

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

export default function LazyEpubReader({ id, loc }: LazyEpubReaderProps) {
	const { colorMode } = useColorMode();

	const ref = useRef<any>(null);

	const [book, setBook] = useState<Book | null>(null);
	const [rendition, setRendition] = useState<Rendition | null>(null);

	const [location, setLocation] = useState({ epubcfi: loc });

	const [visibleNav, { on: showNav, off: hideNav }] = useBoolean(true);

	function handleMouseEnterNav() {
		if (!visibleNav) {
			showNav();
		}
	}

	function handleMouseLeaveNav() {
		if (visibleNav) {
			hideNav();
		}
	}

	// TODO: type me
	function handleLocationChange(newLocation: any) {
		setLocation({
			// @ts-ignore: types are wrong >:(
			epubcfi: newLocation?.start?.cfi ?? null,
			// @ts-ignore: types are wrong >:(
			page: newLocation?.start?.displayed?.page,
			// @ts-ignore: types are wrong >:(
			total: newLocation?.start?.displayed?.total,
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

		book.ready.then(() => {
			if (book.spine) {
				// console.log(book.spine);
				// console.log({ book });

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
	const navigation = useMemo(
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
		}),
		[rendition],
	);

	const { prev, next } = navigation;

	// FIXME: buttons are kinda bad. Especially on mobile.
	// TODO page swipe on mobile
	return (
		<HStack
			className="relative"
			h="full"
			w="full"
			p={4}
			bg={useColorModeValue('white', 'gray.750')}
		>
			<div
				className="fixed left-2 z-[100] h-full flex items-center w-12"
				onMouseEnter={handleMouseEnterNav}
				onMouseLeave={handleMouseLeaveNav}
			>
				<Button hidden={!visibleNav} variant="ghost" p={0} onClick={prev}>
					<CaretLeft />
				</Button>
			</div>
			<div className="h-full w-full" ref={ref} />
			<div
				className="fixed right-2 z-[100] h-full flex items-center w-12"
				onMouseEnter={handleMouseEnterNav}
				onMouseLeave={handleMouseLeaveNav}
			>
				<Button hidden={!visibleNav} variant="ghost" p={0} onClick={next}>
					<CaretRight />
				</Button>
			</div>
		</HStack>
	);
}
