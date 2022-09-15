import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft } from 'phosphor-react';
import { Link, useParams } from 'react-router-dom';
import { Heading } from '@chakra-ui/react';
import { getMediaPage } from '@stump/client/api';

interface ToolbarProps {
	title: string;
	currentPage: number;
	pages: number;
	visible: boolean;
	onPageChange(page: number): void;
}

export default function Toolbar({
	title,
	currentPage,
	pages,
	visible,
	onPageChange,
}: ToolbarProps) {
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
						className="fixed top-0 p-4 w-full bg-opacity-90 bg-gray-700 text-white z-[100]"
					>
						<div className="flex justify-between items-center w-full">
							<div className="flex items-center space-x-4">
								<Link
									className="flex items-center"
									title="Go to media overview"
									to={`/books/${id}`}
								>
									<ArrowLeft size={'1.25rem'} />
								</Link>

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
						className="fixed bottom-0 p-4 w-full overflow-x-scroll bg-opacity-75 shadow-lg text-white z-[100]"
					>
						<div className="flex space-x-2 w-full bottom-0 select-none">
							{/* TODO:  don't do this, terrible loading for most people */}
							{/* TODO: scroll to center current page */}
							{/* TODO: tool tips? */}
							{/* FIXME: styling isn't quite right, should have space on either side... */}
							{Array.from({ length: pages }).map((_, i) => (
								<img
									key={i}
									src={getMediaPage(id, i + 1)}
									className="cursor-pointer h-32 w-auto rounded-md transition duration-300 hover:-translate-y-2 shadow-xl"
									onClick={() => onPageChange(i + 1)}
								/>
							))}
						</div>
					</motion.nav>
				</>
			)}
		</AnimatePresence>
	);
}
