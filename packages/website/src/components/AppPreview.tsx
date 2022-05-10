import React from 'react';
import { motion } from 'framer-motion';

export default function AppPreview() {
	return (
		<div className="flex justify-center relative p-2 sm:p-0 overflow-hidden -mt-7">
			<motion.img
				initial={{ opacity: 0, scale: 0.75 }}
				animate={{ opacity: 1, scale: 1 }}
				transition={{ duration: 1, delay: 0.5 }}
				className="w-[1200px]"
				src="/demo-fallback.png"
			/>
		</div>
	);
}
