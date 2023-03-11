import { Heading, useColorMode } from '@chakra-ui/react'
import { getMediaPage } from '@stump/api'
import { defaultRangeExtractor, Range, useVirtualizer } from '@tanstack/react-virtual'
import clsx from 'clsx'
import { motion } from 'framer-motion'
import { ArrowLeft } from 'phosphor-react'
import { useCallback, useEffect, useRef } from 'react'
import { Link, useParams } from 'react-router-dom'

import ThemeToggle from '../../sidebar/ThemeToggle'

interface ToolbarProps {
	title: string
	currentPage: number
	pages: number
	visible: boolean
	onPageChange(page: number): void
}

export default function Toolbar({
	title,
	currentPage,
	pages,
	visible,
	onPageChange,
}: ToolbarProps) {
	const { id } = useParams()

	if (!id) {
		// should never happen
		throw new Error('No ID provided')
	}

	const parentRef = useRef<HTMLDivElement>(null)
	const rangeRef = useRef([0, 0])
	const columnVirtualizer = useVirtualizer({
		count: pages,
		enableSmoothScroll: true,
		estimateSize: () => 80,
		getScrollElement: () => parentRef.current,
		horizontal: true,
		overscan: 5,
		rangeExtractor: useCallback((range: Range) => {
			rangeRef.current = [range.startIndex, range.endIndex]
			return defaultRangeExtractor(range)
		}, []),
	})

	// FIXME: this is super scufffed, something is throwing off the scrollToIndex and the
	// workaround is atrocious...
	useEffect(
		() => {
			if (visible) {
				// FIXME: why no work
				// columnVirtualizer.scrollToIndex(currentPage, { smoothScroll: true });
				setTimeout(() => {
					const totalSize = columnVirtualizer.getTotalSize()
					const offset = (totalSize / pages) * currentPage

					const targetID = `${id}-page-${currentPage}`
					const target = document.getElementById(targetID)

					if (target) {
						target.scrollIntoView({ behavior: 'smooth', inline: 'center' })
					} else {
						// FIXME: this actually doesn't work lol
						parentRef.current?.scrollTo({ behavior: 'smooth', left: offset })
					}
				}, 50)
			}
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[visible, currentPage],
	)

	const variants = (position: 'top' | 'bottom') => ({
		hidden: {
			opacity: 0,
			transition: {
				duration: 0.2,
				ease: 'easeInOut',
			},
			y: position === 'top' ? '-100%' : '100%',
		},
		visible: {
			opacity: 1,
			transition: {
				duration: 0.2,
				ease: 'easeInOut',
			},
			y: 0,
		},
	})

	return (
		<div>
			<motion.nav
				animate={visible ? 'visible' : 'hidden'}
				variants={variants('top')}
				transition={{ duration: 0.2, ease: 'easeInOut' }}
				className="fixed top-0 z-[100] w-full bg-gray-200 bg-opacity-90 p-4 dark:bg-gray-700 dark:text-white"
			>
				<div className="flex w-full items-center justify-between">
					<div className="flex items-center space-x-4">
						<Link className="flex items-center" title="Go to media overview" to={`/books/${id}`}>
							<ArrowLeft size={'1.25rem'} />
						</Link>

						<Heading size="sm">{title}</Heading>
					</div>
					<div className="flex items-center">
						<ThemeToggle />
					</div>
				</div>
			</motion.nav>
			<motion.nav
				animate={visible ? 'visible' : 'hidden'}
				variants={variants('bottom')}
				transition={{ duration: 0.2, ease: 'easeInOut' }}
				className="fixed bottom-0 z-[100] w-full overflow-x-scroll bg-opacity-75 p-4 text-white shadow-lg"
			>
				<div
					className="relative bottom-0 flex w-full select-none space-x-2"
					ref={parentRef}
					style={{
						width: `${columnVirtualizer.getTotalSize()}px`,
					}}
				>
					{/* TODO: tool tips? */}
					{/* FIXME: styling isn't quite right, should have space on either side... */}
					{columnVirtualizer.getVirtualItems().map((virtualItem, idx) => (
						<img
							id={`${id}-page-${idx + 1}`}
							key={virtualItem.key}
							src={getMediaPage(id, idx + 1)}
							className={clsx(
								currentPage === idx + 1 ? '-translate-y-1 border-brand' : 'border-transparent',
								'h-32 w-auto cursor-pointer rounded-md border-2 border-solid shadow-xl transition duration-300 hover:-translate-y-2 hover:border-brand',
							)}
							onClick={() => onPageChange(idx + 1)}
						/>
					))}
				</div>
			</motion.nav>
		</div>
	)
}
