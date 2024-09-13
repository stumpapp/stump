/* eslint-disable react/prop-types */
import { getMediaPage } from '@stump/api'
import { AspectRatio, cn } from '@stump/components'
import { motion } from 'framer-motion'
import { forwardRef, useEffect, useRef, useState } from 'react'
import {
	ItemProps,
	ListProps,
	ListRange,
	ScrollerProps,
	Virtuoso,
	VirtuosoHandle,
} from 'react-virtuoso'

import { useBookPreferences } from '@/scenes/book/reader/useBookPreferences'

import { useImageBaseReaderContext } from '../context'

export default function ReaderFooter() {
	const { book, currentPage, setCurrentPage } = useImageBaseReaderContext()
	const {
		settings: { showToolBar, preload },
	} = useBookPreferences({ book })

	const [range, setRange] = useState<ListRange>({ endIndex: 0, startIndex: 0 })
	const virtuosoRef = useRef<VirtuosoHandle>(null)

	/**
	 * An effect to scroll the Virtuoso component to the current page
	 * is close to exiting the view.
	 */
	useEffect(() => {
		const pageAsIndex = currentPage - 2
		const { startIndex, endIndex } = range

		const endThresholdMet = endIndex <= pageAsIndex + 2
		const startThresholdMet = startIndex >= pageAsIndex - 2
		const pageIsInView = startThresholdMet && endThresholdMet

		if (!pageIsInView) {
			virtuosoRef.current?.scrollIntoView({
				align: 'center',
				behavior: 'smooth',
				index: pageAsIndex,
			})
		}
	}, [currentPage, range])

	return (
		<motion.nav
			initial={false}
			animate={showToolBar ? 'visible' : 'hidden'}
			variants={transition}
			transition={{ duration: 0.2, ease: 'easeInOut' }}
			className="fixed bottom-0 left-0 z-[100] h-[125px] w-full overflow-hidden bg-opacity-75 text-white shadow-lg"
		>
			<Virtuoso
				ref={virtuosoRef}
				style={{ height: '100%' }}
				horizontalDirection
				data={Array.from({ length: book.pages }).map((_, index) =>
					getMediaPage(book.id, index + 1),
				)}
				components={{
					Item,
					List,
					Scroller,
				}}
				rangeChanged={setRange}
				itemContent={(idx, url) => {
					return (
						<AspectRatio
							onClick={() => setCurrentPage(idx + 1)}
							ratio={2 / 3}
							className={cn(
								'flex cursor-pointer items-center overflow-hidden rounded-md border-2 border-solid border-transparent shadow-xl transition duration-300 hover:border-brand',
								{
									'border-brand': currentPage === idx + 1,
								},
							)}
						>
							<img src={url} className="object-cover" />
						</AspectRatio>
					)
				}}
				overscan={{ main: preload.ahead || 1, reverse: preload.behind || 1 }}
			/>
		</motion.nav>
	)
}

const Scroller = forwardRef<HTMLDivElement, ScrollerProps>(({ children, ...props }, ref) => {
	return (
		<div className="x-6 overflow-y-hidden" ref={ref} {...props}>
			{children}
		</div>
	)
})
Scroller.displayName = 'Scroller'

const List = forwardRef<HTMLDivElement, ListProps>(({ children, ...props }, ref) => {
	return (
		<div className="flex items-center" ref={ref} {...props}>
			{children}
		</div>
	)
})
List.displayName = 'List'

const Item = forwardRef<HTMLDivElement, ItemProps<string>>(({ children, ...props }, ref) => {
	return (
		<div className="flex h-full w-20 items-center pr-2 first:pl-2" ref={ref} {...props}>
			{children}
		</div>
	)
})
Item.displayName = 'Item'

const transition = {
	hidden: {
		opacity: 0,
		transition: {
			duration: 0.2,
			ease: 'easeInOut',
		},
		y: '100%',
	},
	visible: {
		opacity: 1,
		transition: {
			duration: 0.2,
			ease: 'easeInOut',
		},
		y: 0,
	},
}
