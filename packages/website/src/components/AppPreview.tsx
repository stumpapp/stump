import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from 'next-themes';
import Image from 'next/image';

export default function AppPreview() {
	const [mounted, setMounted] = useState(false);

	const { theme } = useTheme();

	useEffect(() => {
		if (!mounted) {
			setMounted(true);
		}
	}, []);

	const imgSrc = useMemo(() => {
		if (theme === 'dark') {
			return '/demo-fallback--dark.png';
		} else if (theme === 'light') {
			return '/demo-fallback--light.png';
		}
	}, [theme, mounted]);

	if (!mounted) {
		return null;
	}

	// TODO: optimize images

	return (
		<div className="flex justify-center relative p-2 sm:p-0 overflow-hidden -mt-7">
			{/* <motion.img
				initial={{ opacity: 0, scale: 0.75 }}
				animate={{ opacity: 1, scale: 1 }}
				transition={{ duration: 1, delay: 0.5 }}
				className="w-[1200px]"
				src="/demo-fallback.png"
			/> */}

			{/* <motion.img
				initial={{ opacity: 0, scale: 0.75 }}
				animate={{ opacity: 1, scale: 1 }}
				transition={{ duration: 1, delay: 0.5 }}
				className="w-[1200px]"
				src={imgSrc}
			/> */}
			<motion.div
				initial={{ opacity: 0, scale: 0.75 }}
				animate={{ opacity: 1, scale: 1 }}
				transition={{ duration: 1, delay: 0.5 }}
			>
				<Image className="w-[1200px]" src={imgSrc!} width={3104} height={1856} />
			</motion.div>
		</div>
	);
}
