import React, { useEffect, useState } from 'react';
import { useAnimation, motion } from 'framer-motion';
import { usePrevious } from '~hooks/usePrevious';
import { useInView } from 'react-intersection-observer';
import Image from 'next/image';

export default function PhoneDemo() {
	const [activePhone, setActivePhone] = useState('pixel');
	const prevActive = usePrevious(activePhone);

	const [animating, setAnimating] = useState(true);

	const iphoneControls = useAnimation();
	const pixelControls = useAnimation();

	const containerControls = useAnimation();
	const { ref, inView } = useInView();

	useEffect(() => {
		if (inView) {
			containerControls.start({ opacity: 1, scale: 1, y: 0 });
		}
	}, [containerControls, inView]);

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
			ref={ref}
			animate={containerControls}
			initial={{ opacity: 0, scale: 0.9, y: -10 }}
			transition={{
				duration: 0.5,
				delay: 1.6,
			}}
		>
			<div className="-ml-12 md:ml-0 flex">
				<motion.img
					animate={pixelControls}
					className="h-[300px] md:h-[400px] lg:h-[525px] object-scale-down"
					onMouseEnter={() => handleHover('pixel')}
					src="/images/pixel-5--TODO.png"
					alt="Stump on Panels App"
				/>

				{/* <motion.div animate={pixelControls} onMouseEnter={() => handleHover('pixel')}>
					<Image
						className="h-[300px] md:h-[400px] lg:h-[525px] object-scale-down"
						src="/images/pixel-5--TODO.png"
						alt="Stump on Panels App"
						height={1362}
						width={668}
					/>
				</motion.div> */}

				{/* <motion.div
					className="relative flex flex-col justify-center h-[300px] md:h-[400px] lg:h-[525px] object-scale-down transform"
					// animate={iphoneControls}
					// onMouseEnter={() => handleHover('iphone')}
				>
					<Image
						// className="h-[300px] md:h-[400px] lg:h-[525px] object-scale-down transform"
						src="/images/panels/iphone-12--black-compressed.png"
						alt="Stump on Panels App"
						// height={1467}
						// width={725}
						layout="fill"
						objectFit="contain"
					/>
				</motion.div> */}

				<motion.img
					animate={iphoneControls}
					className="h-[300px] md:h-[400px] lg:h-[525px] object-scale-down transform"
					src="/images/panels/iphone-12--black-compressed.png"
					onMouseEnter={() => handleHover('iphone')}
					alt="Stump on Panels App"
				/>
			</div>
		</motion.div>
	);
}
