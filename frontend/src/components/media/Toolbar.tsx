import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft } from 'phosphor-react';
import { useParams } from 'react-router-dom';
import { Heading, Spacer, Text } from '@chakra-ui/react';

interface ToolbarProps {
	title: string;
	currentPage: number;
	pages: number;
	visible: boolean;
}

export default function Toolbar({ title, currentPage, pages, visible }: ToolbarProps) {
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
						className="fixed top-0 p-4 w-full bg-opacity-75 bg-gray-700 text-white"
					>
						<div className="flex justify-between items-center w-full">
							<div className="flex items-center space-x-4">
								<a className="flex items-center" title="Go to media overview" href={`/books/${id}`}>
									<ArrowLeft size={'1.25rem'} />
								</a>

								<Heading size="sm">{title}</Heading>
							</div>
							<div className="flex items-center">TODO: idk what</div>
						</div>
					</motion.nav>
					<motion.nav
						initial={{ opacity: 0, y: 100 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: 100 }}
						transition={{ duration: 0.2, ease: 'easeInOut' }}
						className="fixed bottom-0 p-4 w-full bg-opacity-75 bg-gray-700 text-white"
					>
						<div className="flex space-x-2">
							<Text>
								Page {currentPage} of {pages}
							</Text>

							<Spacer />
							<div>TODO: page previews</div>
						</div>
					</motion.nav>
				</>
			)}
		</AnimatePresence>
	);
}
