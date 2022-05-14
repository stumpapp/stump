import { useAnimation } from 'framer-motion';
import { useEffect } from 'react';
import { useInView } from 'react-intersection-observer';

const DEFAULT_INITIAL = {
	opacity: 0,
	scale: 0.9,
};

const DEFAULT_ANIMATE = {
	opacity: 1,
	scale: 1,
};

const DEFAULT_EXIT = {
	opacity: 0,
	scale: 0.9,
};

// const DEFAULT_TRANSITION = {
// 	duration: 0.5,
// 	delay: 0.25,
// };

interface Animations {
	initial?: object;
	animate?: object;
	exit?: object;
}

export function useAnimateOnInView(animations: Animations, animateOnce = false) {
	const controls = useAnimation();
	const { ref, inView } = useInView();

	// useEffect(() => {
	// 	controls.start(animations.initial || DEFAULT_INITIAL);
	// }, []);

	useEffect(() => {
		if (inView) {
			console.log('inView', animations.animate ?? DEFAULT_ANIMATE);
			controls.start(animations.animate ?? DEFAULT_ANIMATE);
			// controls.start(animations.initial ?? DEFAULT_INITIAL).then(() => {
			// 	controls.start(animations.animate ?? DEFAULT_ANIMATE);
			// });
		}
		if (!inView && !animateOnce) {
			controls.start(animations.exit ?? DEFAULT_EXIT);
		}
	}, [controls, inView]);

	return { ref, controls } as const;
}
