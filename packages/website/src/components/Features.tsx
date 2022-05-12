import React, { useEffect, useState } from 'react';
import { motion, useAnimation } from 'framer-motion';
import { usePrevious } from '~hooks/usePrevious';

const PHONE_ACTIVE_STYLE = {
	transform: 'translate(3rem, 1rem) rotate(-6deg)',
};

function PhoneDemo() {
	const [activePhone, setActivePhone] = useState('pixel');
	const prevActive = usePrevious(activePhone);

	const [animating, setAnimating] = useState(true);

	const iphoneControls = useAnimation();
	const pixelControls = useAnimation();

	useEffect(() => {
		setAnimating(true);
		if (activePhone === 'pixel') {
			if (prevActive === 'iphone') {
				iphoneControls.start({
					x: 0,
					rotate: 0,
					zIndex: 0,
				});
			}

			pixelControls
				.start({
					x: '3rem',
					y: '2rem',
					rotate: '-6deg',
					zIndex: 1,
				})
				.then(() => setAnimating(false));
		} else if (activePhone === 'iphone') {
			if (prevActive === 'pixel') {
				pixelControls.start({
					x: '100%',
					y: 0,
					rotate: 0,
					zIndex: 0,
				});
			}

			iphoneControls
				.start({
					x: 'calc(-100% + 3rem)',
					y: '1rem',
					rotate: '-6deg',
					zIndex: 1,
				})
				.then(() => setAnimating(false));
		}
	}, [activePhone]);

	function handleHover(phone: string) {
		if (!animating) {
			setActivePhone(phone);
		}
	}

	return (
		<motion.div
			whileInView={{ opacity: 1, scale: 1, y: 0 }}
			initial={{ opacity: 0, scale: 0.9, y: -10 }}
			transition={{
				duration: 0.35,
				delay: 1.25,
			}}
		>
			<div className="-ml-12 md:ml-0 flex">
				<motion.img
					animate={pixelControls}
					className="shadow h-[300px] md:h-[400px] lg:h-[525px] object-scale-down"
					onMouseEnter={() => handleHover('pixel')}
					src="/images/pixel-5--TODO.png"
					alt="Stump on Panels App"
				/>

				<motion.img
					animate={iphoneControls}
					className="shadow h-[300px] md:h-[400px] lg:h-[525px] object-scale-down transform"
					src="/images/panels/iphone-12--black.png"
					onMouseEnter={() => handleHover('iphone')}
					alt="Stump on Panels App"
				/>
			</div>
		</motion.div>
	);
}

interface AppLogoProps {
	index: number;
	title: string;
	src: string;
	alt: string;
	href: string;
}

function AppLogoContainer({ index, title, href, src, alt }: AppLogoProps) {
	const baseDelay = 0.5;

	return (
		<motion.a
			href={href}
			whileInView={{ opacity: 1, scale: 1 }}
			initial={{ opacity: 0, scale: 0.85 }}
			transition={{
				duration: 0.35,
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
			<h3 className="text-gray-100">{title}</h3>
		</motion.a>
	);
}

const logos: Omit<AppLogoProps, 'index'>[] = [
	{
		title: 'Panels',
		src: '/images/panels/panels-logo.png',
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

function ReaderCompatibility() {
	return (
		<div className="flex flex-col space-y-12 items-center md:flex-row md:space-y-0 md:items-start md:justify-between">
			<div className="md:w-2/3 flex flex-col space-y-4">
				<motion.h2
					whileInView={{ opacity: 1, scale: 1, y: 0 }}
					initial={{ opacity: 0, scale: 0.9, y: 10 }}
					transition={{
						duration: 0.35,
						delay: 0.25,
					}}
					className="text-2xl md:text-3xl font-extrabold text-gray-100"
				>
					Compatible with your favorite readers
				</motion.h2>
				<motion.p
					whileInView={{ opacity: 1, scale: 1, y: 0 }}
					initial={{ opacity: 0, scale: 0.9, y: -10 }}
					transition={{
						duration: 0.35,
						delay: 0.5,
					}}
					className="md:text-lg text-gray-400"
				>
					You aren't stuck with the built-in reader! With Stump, you can easily read all your digial
					media from your preferred reader - so long as they support the OPDS specifications, it's
					compatible!
				</motion.p>

				<div className="pt-6 flex justify-between md:justify-start md:space-x-6 lg:space-x-12">
					{logos.map((logo, i) => (
						<AppLogoContainer index={i} {...logo} />
					))}
				</div>
			</div>

			<PhoneDemo />
		</div>
	);
}

function FormatSupport() {
	return (
		<div className="flex justify-between items-center">
			<div className="w-[50%]">
				<h2 className="text-3xl font-extrabold text-gray-100">Emphasis on format support</h2>
				<p className="mt-4 text-lg text-gray-400">
					While not every digital media format is compatible with the OPDS specifications, Stump's
					built-in readers support a wide range of formats.
				</p>
			</div>

			<div className="flex flex-col space-y-6">
				<div className="text-white">something</div>
			</div>
		</div>
	);
}

// TODO: can't decide if I want more spacing (like h-screen per feature)
export default function Features() {
	return (
		<div className="flex flex-col space-y-24">
			<ReaderCompatibility />
			<FormatSupport />
		</div>
	);
}
