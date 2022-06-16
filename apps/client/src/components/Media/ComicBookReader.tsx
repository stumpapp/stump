import React, { useEffect, useMemo, useState } from 'react';
import { HStack, Stack, useBoolean } from '@chakra-ui/react';
import Toolbar from './Toolbar';
import { useAnimation, motion, useMotionValue, useTransform } from 'framer-motion';
import type { ControlsAnimationDefinition } from 'framer-motion/types/animation/types';
import { useHotkeys } from 'react-hotkeys-hook';
// import toast from 'react-hot-toast';
// import { useSwipeable } from 'react-swipeable';

type PageAnimation = [
	ControlsAnimationDefinition,
	ControlsAnimationDefinition,
	ControlsAnimationDefinition,
];

const FORWARD_START_ANIMATION: ControlsAnimationDefinition = {
	x: '-200%',
	opacity: 0.5,
	transition: {
		duration: 0.35,
	},
};

const FORWARD_RESET_ANIMATION: ControlsAnimationDefinition = {
	opacity: 0.1,
	x: '200%',
};

const FORWARD_END_ANIMATION: ControlsAnimationDefinition = {
	x: '0%',
	opacity: 1,
	transition: {
		duration: 0.35,
	},
};

const FORWARD_ANIMATION: PageAnimation = [
	FORWARD_START_ANIMATION,
	FORWARD_RESET_ANIMATION,
	FORWARD_END_ANIMATION,
];

const BACKWARD_START_ANIMATION: ControlsAnimationDefinition = {
	x: '200%',
	opacity: 1,
	transition: {
		duration: 0.35,
	},
};

const BACKWARD_RESET_ANIMATION: ControlsAnimationDefinition = {
	opacity: 0.1,
	x: '-200%',
};

const BACKWARD_END_ANIMATION: ControlsAnimationDefinition = {
	x: '0%',
	opacity: 1,
	transition: {
		duration: 0.35,
	},
};

const BACKWARD_ANIMATION: PageAnimation = [
	BACKWARD_START_ANIMATION,
	BACKWARD_RESET_ANIMATION,
	BACKWARD_END_ANIMATION,
];

export interface ComicReaderProps {
	currentPage: number;
	media: Media;

	onPageChange: (page: number) => void;
	getPageUrl(page: number): string;
}

// FIXME: does not work well AT ALL...
// works OK when moving between portrait images on desktop.
// doesn't quite work on mobile, the 200% movement is too much, but 100% on desktop is too little.
// doesn't work when landscape and portrait pages are back to back. The portrait image gets
// 'stuck' next to the large when it slides away which is a bit of a problem.
export default function ComicBookReader({
	currentPage,
	media,
	onPageChange,
	getPageUrl,
}: ComicReaderProps) {
	const x = useMotionValue(0);

	// const next = useTransform(x, (latest) => {
	// 	const center = window.innerWidth / 2;

	// 	console.log('center', center);
	// 	console.log('latest', latest);

	// 	if (Math.abs(latest) > center) {
	// 		return center;
	// 	}

	// 	return latest;
	// });

	const controls = useAnimation();

	// This is for the hotkeys
	const currPageRef = React.useRef(currentPage);

	useEffect(() => {
		currPageRef.current = currentPage;
	}, [currentPage]);

	const imageUrls = useMemo(() => {
		let urls = [];

		// if has previous
		if (currentPage > 1) {
			urls.push(getPageUrl(currentPage - 1));
		} else {
			urls.push(undefined);
		}

		urls.push(getPageUrl(currentPage));

		// if has next
		if (currentPage < media.pages) {
			urls.push(getPageUrl(currentPage + 1));
		} else {
			urls.push(undefined);
		}

		return urls;
	}, [currentPage]);

	const [centerLoaded, { on }] = useBoolean(false);

	return (
		<div className="relative flex h-full items-center justify-center">
			{imageUrls[0] && centerLoaded && (
				<motion.img
					// animate={controls}
					transition={{ ease: 'easeOut' }}
					// onClick={toggle}
					// Note: Comic book ratio is -> 663 : 1024
					style={{ x }}
					className="absolute object-scale-down max-h-full right-[100%]"
					src={imageUrls[0]}
					// src={getPageUrl(currentPage - 1)}
					onError={(err) => {
						// @ts-ignore
						err.target.src = '/src/favicon.png';
					}}
					// onLoad={handleImageLoaded}
				/>
			)}

			{/* <div className="flex w-screen h-full flex-shrink-0 justify-center"> */}
			<motion.img
				animate={controls}
				drag="x"
				dragElastic={1}
				dragConstraints={{ left: 0, right: 0 }}
				onDragEnd={(_e, info) => {
					const { velocity, offset } = info;

					if ((velocity.x <= -200 || offset.x <= -300) && currPageRef.current < media.pages) {
						controls
							.start({
								x: '-200%',
								transition: {
									duration: 0.35,
								},
							})
							.then(() => {
								onPageChange(currPageRef.current + 1);
								controls.set({ x: '0%' });
							});
					} else if ((velocity.x >= 200 || offset.x >= 300) && currPageRef.current > 1) {
						controls
							.start({
								x: '200%',
								transition: {
									duration: 0.35,
								},
							})
							.then(() => {
								onPageChange(currPageRef.current - 1);
								controls.set({ x: '0%' });
							});
					}
				}}
				style={{ x }}
				transition={{ ease: 'easeOut' }}
				// onClick={toggle}
				// Note: Comic book ratio is -> 663 : 1024
				className="absolute object-scale-down max-h-full"
				// src={getPageUrl(currentPage)}
				src={imageUrls[1]}
				onError={(err) => {
					// @ts-ignore
					err.target.src = '/src/favicon.png';
				}}
				onLoad={() => {
					if (!centerLoaded) {
						on();
					}
				}}
			/>
			{/* </div> */}

			{imageUrls[2] && centerLoaded && (
				<motion.img
					// animate={controls}
					transition={{ ease: 'easeOut' }}
					// onClick={toggle}
					// Note: Comic book ratio is -> 663 : 1024
					style={{ x }}
					className="absolute object-scale-down max-h-full left-[100%]"
					// src={getPageUrl(currentPage + 1)}
					src={imageUrls[2]}
					onError={(err) => {
						// @ts-ignore
						err.target.src = '/src/favicon.png';
					}}
					// onLoad={handleImageLoaded}
				/>
			)}
		</div>
	);
}

// export default function ComicBookReader({
// 	currentPage,
// 	media,
// 	onPageChange,
// 	getPageUrl,
// }: ComicReaderProps) {
// 	const controls = useAnimation();

// 	const [showToolbar, { toggle, off }] = useBoolean(false);

// 	// This is for the hotkeys
// 	const currPageRef = React.useRef(currentPage);

// 	useEffect(() => {
// 		currPageRef.current = currentPage;
// 	}, [currentPage]);

// 	// FIXME: this animation is far from perfect, a little stuttering towards the end when
// 	// changing the pages. ALSO, this won't be good for mobile. I want to support swiping.
// 	// TODO: test with throttled connection, I would guess it's meh
// 	function doAnimation(animation: PageAnimation, page: number) {
// 		controls.start(animation[0]).then(() => {
// 			controls.set(animation[1]);
// 			onPageChange(page);
// 			controls.start(animation[2]);
// 		});
// 	}

// 	function handleChangePage(page: number) {
// 		if (page > 0 && page <= media.pages) {
// 			if (page > currPageRef.current) {
// 				doAnimation(FORWARD_ANIMATION, page);
// 			} else {
// 				doAnimation(BACKWARD_ANIMATION, page);
// 			}
// 		} else {
// 			// FIXME: popup that shows the next comic book in the series
// 			toast.error('The page you are trying to access does not exist');
// 		}
// 	}

// 	function handlePreloadPage(page: number) {
// if (page > 0 && page <= media.pages) {
// 	const img = new Image();
// 	img.src = getPageUrl(page);
// }

// if (page > 0 && page <= media.pages - 1) {
// 	const img = new Image();
// 	img.src = getPageUrl(page + 1);
// }
// 	}

// 	useHotkeys('right, left, space, esc', (_, handler) => {
// 		switch (handler.key) {
// 			case 'right':
// 				handleChangePage(currPageRef.current + 1);
// 				break;
// 			case 'left':
// 				handleChangePage(currPageRef.current - 1);
// 				break;
// 			case 'space':
// 				toggle();
// 				break;
// 			case 'esc':
// 				off();
// 				break;
// 		}
// 	});

// 	// FIXME: I don't like this for comic books. I think stylistically I should look
// 	// at something like panels. On mobile breakpoints, preloaded images should be RIGHT next to
// 	// the currently loaded image. And when a user starts swiping, a drag effect should be shown, where
// 	// the image is moving away and the next image is getting slid into the viewport.
// 	const swipeHandlers = useSwipeable({
// 		onSwipedRight: () => handleChangePage(currPageRef.current - 1),
// 		onSwipedLeft: () => handleChangePage(currPageRef.current + 1),
// 		preventScrollOnSwipe: true,
// 	});

// 	return (
// 		<>
// 			<Toolbar
// 				title={media.name}
// 				currentPage={currentPage}
// 				pages={media.pages}
// 				visible={showToolbar}
// 			/>

// 			<HStack h="full" w="full" justify="center" align="center" spacing={0}>
// 				<div
// 					className="flex-1 w-full h-full z-50"
// 					onClick={() => handleChangePage(currentPage - 1)}
// 				/>
// 				<div className="fixed inset-0 z-[51] md:hidden" {...swipeHandlers} onClick={toggle} />
// 				<motion.img
// 					animate={controls}
// 					transition={{ ease: 'easeOut' }}
// 					onClick={toggle}
// 					// Note: Comic book ratio is -> 663 : 1024
// 					className="object-scale-down max-h-full"
// 					src={getPageUrl(currentPage)}
// 					onError={(err) => {
// 						// @ts-ignore
// 						err.target.src = '/src/favicon.png';
// 					}}
// 					onLoad={() => handlePreloadPage(currentPage + 1)}
// 				/>
// 				<div
// 					className="flex-1 w-full h-full z-50"
// 					onClick={() => handleChangePage(currentPage + 1)}
// 				/>
// 			</HStack>
// 		</>
// 	);

// 	return (
// 		<div className="h-full w-full flex justify-center items-center">
// 			<div
// 				className="flex-1 w-full h-full z-50"
// 				onClick={() => handleChangePage(currentPage - 1)}
// 			/>

// 			<div className="h-full w-full relative">
// 				{/* <div
// 					className="fixed inset-0 z-[99] md:hidden"
// 					{...swipeHandlers}
// 					onClick={handleTapEvent}
// 				/> */}
// 				<motion.img
// 					animate={controls}
// 					transition={{ ease: 'easeOut' }}
// 					onClick={toggle}
// 					// Note: Comic book ratio is -> 663 : 1024
// 					className="object-scale-down max-h-full"
// 					src={getPageUrl(currentPage)}
// 					onError={(err) => {
// 						// @ts-ignore
// 						err.target.src = '/src/favicon.png';
// 					}}
// 					onLoad={() => handlePreloadPage(currentPage + 1)}
// 				/>
// 			</div>

// 			<div
// 				className="flex-1 w-full h-full z-50"
// 				onClick={() => handleChangePage(currentPage + 1)}
// 			/>

// 			<Toolbar
// 				title={media.name}
// 				currentPage={currentPage}
// 				pages={media.pages}
// 				visible={showToolbar}
// 			/>
// 		</div>
// 	);
// }
