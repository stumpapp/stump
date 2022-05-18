import { useAnimation, motion } from 'framer-motion';
import React, { useEffect } from 'react';
import { useInView } from 'react-intersection-observer';

interface Props {
	children: React.ReactNode;
}
// TODO: figure out componentizing `Header` and `SubHeader` using `AnimatedOnVisible`

export function FeatureHeader({ children }: Props) {
	const controls = useAnimation();
	const { ref, inView } = useInView();

	useEffect(() => {
		if (inView) {
			controls.start({ opacity: 1, scale: 1, y: 0 });
		}
	}, [controls, inView]);

	return (
		<motion.h2
			ref={ref}
			animate={controls}
			initial={{ opacity: 0, scale: 0.9, y: 10 }}
			transition={{
				duration: 0.5,
				delay: 0.25,
			}}
			className="text-2xl md:text-3xl font-extrabold text-gray-850 dark:text-gray-100"
		>
			{children}
		</motion.h2>
	);
}

export function FeatureSubHeader({ children }: Props) {
	const controls = useAnimation();
	const { ref, inView } = useInView();

	useEffect(() => {
		if (inView) {
			controls.start({ opacity: 1, scale: 1, y: 0 });
		}
	}, [controls, inView]);

	return (
		<motion.p
			ref={ref}
			animate={controls}
			initial={{ opacity: 0, scale: 0.9, y: -10 }}
			transition={{
				duration: 0.5,
				delay: 0.5,
			}}
			className="md:text-lg text-gray-700 dark:text-gray-400"
		>
			{children}
		</motion.p>
	);
}
