import React from 'react';
import Button from './ui/Button';

import { motion } from 'framer-motion';
import { Github } from '@icons-pack/react-simple-icons';

const navigation = [
	{ name: 'Product', href: '#' },
	{ name: 'Features', href: '#' },
	{ name: 'Marketplace', href: '#' },
	{ name: 'Company', href: '#' },
];

export default function Hero() {
	return (
		<div className="relative">
			<div className="text-center">
				<motion.h1
					initial={{ opacity: 0, y: -40 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.5 }}
					className="text-4xl tracking-tight font-extrabold text-gray-100 sm:text-5xl md:text-6xl"
				>
					<span className="block xl:inline">A lightning fast</span>{' '}
					<span className="block xl:inline">media server.</span>
				</motion.h1>
				<motion.p
					initial={{ opacity: 0, y: 40 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.5, delay: 0.25 }}
					className="mt-3 max-w-md mx-auto text-base text-gray-400 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl"
				>
					Free, open source, self-hosting for all your comic books, manga and digital book
					collections. Supports the most popular reading formats.
				</motion.p>
				<div className="mt-5 max-w-md mx-auto flex justify-center md:mt-8">
					<motion.div
						className="flex"
						initial={{ opacity: 0, scale: 0.5 }}
						animate={{ opacity: 1, scale: 1 }}
						transition={{ duration: 0.5, delay: 1.15 }}
					>
						<Button
							className="flex items-center space-x-2"
							href="https://www.github.com/aaronleopold/stump"
							target="_blank"
							intent="ghost"
						>
							<Github />

							<span>Github</span>
						</Button>
					</motion.div>
				</div>
			</div>
		</div>
	);
}
