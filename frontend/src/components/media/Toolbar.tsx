import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft } from 'phosphor-react';

interface ToolbarProps {
	// media: Media;
	visible: boolean;
	// setVisible: (visible: boolean) => void;
}

export default function Toolbar({ visible }: ToolbarProps) {
	return (
		<AnimatePresence>
			{visible && (
				<>
					<motion.nav
						initial={{ opacity: 0, y: -100 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: -100 }}
						transition={{ duration: 0.2, ease: 'easeInOut' }}
						className="fixed top-0 p-4 w-full bg-gray-700 text-white"
					>
						<div className="flex justify-between items-center w-full">
							<div className="flex items-center">
								<a
									/*title={`Go to ${media.name} Overview`}*/ /*href={`/book/${media.id}`}*/ href="#"
								>
									<ArrowLeft size={'1.25rem'} />
								</a>
							</div>
							<div className="flex items-center">todo</div>
						</div>
					</motion.nav>
					<motion.nav
						initial={{ opacity: 0, y: 100 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: 100 }}
						transition={{ duration: 0.2, ease: 'easeInOut' }}
						className="fixed bottom-0 p-4 w-full bg-gray-700 text-white"
					>
						testing 123
					</motion.nav>
				</>
			)}
		</AnimatePresence>
	);
}
