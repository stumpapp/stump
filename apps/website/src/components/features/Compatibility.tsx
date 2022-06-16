import React, { useEffect } from 'react';

import { motion, useAnimation } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import PhoneDemo from './PhoneDemo';
import { FeatureHeader, FeatureSubHeader } from './FeatureHeader';

interface AppLogoProps {
	index: number;
	title: string;
	src: string;
	alt: string;
	href: string;
}

function AppLogoContainer({ index, title, href, src, alt }: AppLogoProps) {
	const baseDelay = 0.75;

	const controls = useAnimation();
	const { ref, inView } = useInView();

	useEffect(() => {
		if (inView) {
			controls.start({ opacity: 1, scale: 1 });
		}
	}, [controls, inView]);

	return (
		<motion.a
			ref={ref}
			animate={controls}
			href={href}
			initial={{ opacity: 0, scale: 0.85 }}
			transition={{
				duration: 0.5,
				delay: baseDelay + index * 0.15,
			}}
			className="flex flex-col justify-center items-center space-y-3"
			target="_blank"
		>
			<img
				className="h-12 w-12 md:h-16 md:w-16 lg:h-20 lg:w-20 rounded-lg shadow"
				src={src}
				alt={alt}
			/>
			<h3 className="text-gray-700 dark:text-gray-100">{title}</h3>
		</motion.a>
	);
}

// TODO: render black panels logo on light theme?
const logos: Omit<AppLogoProps, 'index'>[] = [
	{
		title: 'Panels',
		src: '/images/panels/panels-logo--white.png',
		alt: 'Panels Logo',
		href: 'https://panels.app',
	},
	{
		title: 'Chunky Reader',
		src: '/images/chunky-reader-logo.png',
		alt: 'Chunky Reader Logo',
		href: 'https://apps.apple.com/us/app/chunky-comic-reader/id663567628',
	},
	{
		title: 'Moon Reader',
		src: '/images/moon-reader-logo.png',
		alt: 'Moon Reader Logo',
		href: 'https://play.google.com/store/apps/details?id=com.flyersoft.moonreader',
	},
	{
		title: 'Kybook',
		src: '/images/kybook-logo.png',
		alt: 'Kybook Logo',
		href: 'http://kybook-reader.com/',
	},
];

export default function Compatibility() {
	return (
		<div className="flex flex-col space-y-12 items-center md:flex-row md:space-y-0 md:items-start md:justify-between">
			<div className="md:w-2/3 flex flex-col space-y-4">
				<FeatureHeader>Compatible with your favorite readers</FeatureHeader>

				<FeatureSubHeader>
					You aren&apos;t stuck with the built-in reader! With Stump, you can easily read all your
					digital media from your preferred reader - so long as they support the OPDS
					specifications, it&apos;s compatible!
				</FeatureSubHeader>

				<div className="pt-6 flex justify-between md:justify-start md:space-x-6 lg:space-x-12">
					{logos.map((logo, i) => (
						<AppLogoContainer key={logo.href} index={i} {...logo} />
					))}
				</div>
			</div>

			<PhoneDemo />
		</div>
	);
}
