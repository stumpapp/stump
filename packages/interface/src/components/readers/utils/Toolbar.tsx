import { getMediaPage } from '@stump/api'
import { cx, Heading } from '@stump/components'
import { defaultRangeExtractor, Range, useVirtualizer } from '@tanstack/react-virtual'
import { motion } from 'framer-motion'
import { ArrowLeft } from 'phosphor-react'
import { useCallback, useEffect, useRef } from 'react'
import { Link, useParams } from 'react-router-dom'

import paths from '../../../paths'
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
		throw new Error('This reader must be rendered within a book route with an ID.')
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
	// workarounds are atrocious...
	const totalSize = columnVirtualizer.getTotalSize()
	useEffect(() => {
		if (visible) {
			const offset = (totalSize / pages) * currentPage

			const targetID = `${id}-page-${currentPage}`
			const target = document.getElementById(targetID)

			// NOTE: workaround 1
			if (target) {
				target.scrollIntoView({ behavior: 'smooth', inline: 'center' })
			} else {
				// NOTE: workaround 2 (backup), doesn't even work...
				parentRef.current?.scrollTo({ behavior: 'smooth', left: offset })
			}
		}
	}, [visible, currentPage, id, pages, totalSize])

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
				className="fixed top-0 z-[100] w-full bg-gray-100/95 p-4 dark:bg-gray-1000/95 dark:text-white"
			>
				<div className="flex w-full items-center justify-between">
					<div className="flex items-center space-x-4">
						<Link
							className="flex items-center"
							title="Go to media overview"
							to={paths.bookOverview(id)}
						>
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
							className={cx(
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
