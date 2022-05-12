import React, { useEffect } from 'react';
import { motion, useAnimation } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { ControlsAnimationDefinition } from 'framer-motion/types/animation/types';

const DEFAULT_INITIAL = {};

const DEFAULT_ANIMATE: ControlsAnimationDefinition = {
	opacity: 1,
	scale: 1,
};

const DEFAULT_EXIT: ControlsAnimationDefinition = {
	opacity: 0,
	scale: 0.9,
};

const DEFAULT_TRANSITION = {
	duration: 0.5,
	delay: 0.25,
};

// FIXME: doesn't work lawl

export interface AnimatedOnVisibleProps extends PropsOf<typeof motion.div> {
	animateOnce?: boolean;
}

export default function AnimatedOnVisible({
	animateOnce = true,
	initial,
	transition,
	...props
}: AnimatedOnVisibleProps) {
	const controls = useAnimation();
	const { ref, inView } = useInView();

	useEffect(() => {
		console.log('inView', inView);

		if (inView) {
			const animate = props.animate ?? DEFAULT_ANIMATE;

			console.log('animate', animate);

			// TODO: I should fix the props so this isn't an issue
			if (typeof animate !== 'object') {
				throw new Error('Animate must be an object');
			}

			controls.start(animate as ControlsAnimationDefinition);
		}

		if (!inView && !animateOnce && props.exit) {
			controls.start(props.exit ?? DEFAULT_EXIT);
		}
	}, [controls, inView]);

	return (
		<motion.div
			ref={ref}
			initial={initial ?? DEFAULT_INITIAL}
			transition={transition ?? DEFAULT_TRANSITION}
			animate={controls}
			{...props}
		/>
	);
}
