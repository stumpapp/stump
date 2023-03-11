import { Heading } from '@chakra-ui/react'
import { getMediaPage } from '@stump/api'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft } from 'phosphor-react'
import { Link, useParams } from 'react-router-dom'

interface ToolbarProps {
	title: string
	currentPage: number
	pages: number
	visible: boolean
	onPageChange(page: number): void
}

export default function Toolbar({ title, pages, visible, onPageChange }: ToolbarProps) {
	const { id } = useParams()

	if (!id) {
		// should never happen
		throw new Error('woah boy how strange 0.o')
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
						className="fixed top-0 z-[100] w-full bg-gray-700 bg-opacity-90 p-4 text-white"
					>
						<div className="flex w-full items-center justify-between">
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
						className="fixed bottom-0 z-[100] w-full overflow-x-scroll bg-opacity-75 p-4 text-white shadow-lg"
					>
						<div className="bottom-0 flex w-full select-none space-x-2">
							{/* TODO:  don't do this, terrible loading for most people */}
							{/* TODO: scroll to center current page */}
							{/* TODO: tool tips? */}
							{/* FIXME: styling isn't quite right, should have space on either side... */}
							{Array.from({ length: pages }).map((_, i) => (
								<img
									key={i}
									src={getMediaPage(id, i + 1)}
									className="h-32 w-auto cursor-pointer rounded-md shadow-xl transition duration-300 hover:-translate-y-2"
									onClick={() => onPageChange(i + 1)}
								/>
							))}
						</div>
					</motion.nav>
				</>
			)}
		</AnimatePresence>
	)
}
