import React, { useEffect, useState } from 'react';
import { motion, useAnimation } from 'framer-motion';
import { usePrevious } from '~hooks/usePrevious';
import { useInView } from 'react-intersection-observer';
import AnimatedOnVisible from './ui/AnimatedOnVisible';
import { useAnimateOnInView } from '~hooks/useAnimateOnInView';
import Compatibility from './features/Compatibility';

// function ReaderCompatibility() {
// 	return (
// 		<div className="flex flex-col space-y-12 items-center md:flex-row md:space-y-0 md:items-start md:justify-between">
// 			<div className="md:w-2/3 flex flex-col space-y-4">
// 				<AnimatedHeading />

// 				<motion.p
// 					whileInView={{ opacity: 1, scale: 1, y: 0 }}
// 					initial={{ opacity: 0, scale: 0.9, y: -10 }}
// 					exit={{ opacity: 1, scale: 1, y: 0 }}
// 					transition={{
// 						duration: 0.5,
// 						delay: 0.5,
// 					}}
// 					className="md:text-lg text-gray-400"
// 				>
// 					You aren't stuck with the built-in reader! With Stump, you can easily read all your digial
// 					media from your preferred reader - so long as they support the OPDS specifications, it's
// 					compatible!
// 				</motion.p>

// 				<div className="pt-6 flex justify-between md:justify-start md:space-x-6 lg:space-x-12">
// 					{logos.map((logo, i) => (
// 						<AppLogoContainer index={i} {...logo} />
// 					))}
// 				</div>
// 			</div>

// 			<PhoneDemo />
// 		</div>
// 	);
// }

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
			<Compatibility />
			<FormatSupport />
		</div>
	);
}
