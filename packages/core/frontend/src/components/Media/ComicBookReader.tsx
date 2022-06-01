import React, { useEffect } from 'react';
import { useBoolean } from '@chakra-ui/react';
import Toolbar from './Toolbar';
import { useAnimation, motion } from 'framer-motion';
import type { ControlsAnimationDefinition } from 'framer-motion/types/animation/types';
import { useHotkeys } from 'react-hotkeys-hook';
import toast from 'react-hot-toast';

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

export default function ComicBookReader({
	currentPage,
	media,
	onPageChange,
	getPageUrl,
}: ComicReaderProps) {
	const controls = useAnimation();

	const [showToolbar, { toggle, off }] = useBoolean(false);

	// This is for the hotkeys
	const currPageRef = React.useRef(currentPage);

	useEffect(() => {
		currPageRef.current = currentPage;
	}, [currentPage]);

	// FIXME: this animation is far from perfect, a little stuttering towards the end when
	// changing the pages. ALSO, this won't be good for mobile. I want to support swiping.
	// TODO: test with throttled connection, I would guess it's meh
	function doAnimation(animation: PageAnimation, page: number) {
		controls.start(animation[0]).then(() => {
			controls.set(animation[1]);
			onPageChange(page);
			controls.start(animation[2]);
		});
	}

	function handleChangePage(page: number) {
		console.log('changing page to', page);
		if (page > 0 && page <= media.pages) {
			if (page > currPageRef.current) {
				doAnimation(FORWARD_ANIMATION, page);
			} else {
				doAnimation(BACKWARD_ANIMATION, page);
			}
		} else {
			toast.error('The page you are trying to access does not exist');
		}
	}

	function handlePreloadPage(page: number) {
		if (page > 0 && page <= media.pages) {
			// TODO: prefetch loading of next page
		}
	}

	useHotkeys('right, left, space, esc', (_, handler) => {
		switch (handler.key) {
			case 'right':
				// handlePreloadPage(currentPage + 1);
				handleChangePage(currPageRef.current + 1);
				break;
			case 'left':
				// handlePreloadPage(currentPage - 1);
				handleChangePage(currPageRef.current - 1);
				break;
			case 'space':
				toggle();
				break;
			case 'esc':
				off();
				break;
		}
	});

	return (
		<div className="h-full w-full flex justify-center items-center">
			<div
				className="flex-1 w-full h-full z-50"
				onClick={() => handleChangePage(currentPage - 1)}
				onMouseEnter={() => handlePreloadPage(currentPage - 1)}
			/>

			<motion.img
				animate={controls}
				transition={{ ease: 'easeOut' }}
				onClick={toggle}
				// Note: Comic book ratio is -> 663 : 1024
				className="object-scale-down max-h-full"
				src={getPageUrl(currentPage)}
				onError={(err) => {
					// @ts-ignore
					err.target.src = '/src/favicon.png';
				}}
			/>

			<div
				className="flex-1 w-full h-full z-50"
				onClick={() => handleChangePage(currentPage + 1)}
				onMouseEnter={() => handlePreloadPage(currentPage + 1)}
			/>

			<Toolbar
				title={media.name}
				currentPage={currentPage}
				pages={media.pages}
				visible={showToolbar}
			/>
		</div>
	);
}
