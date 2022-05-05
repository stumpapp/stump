import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft } from 'phosphor-react';
import { useParams } from 'react-router-dom';

interface ToolbarProps {
	// media: Media;
	visible: boolean;
	// setVisible: (visible: boolean) => void;
}

export default function Toolbar({ visible }: ToolbarProps) {
	const { id } = useParams();

	if (!id) {
		// should never happen
		throw new Error('woah boy how strange 0.o');
	}

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
								<a title="Go to media overview" href={`/books/${id}`}>
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
