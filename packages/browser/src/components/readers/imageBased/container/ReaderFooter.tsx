import { useSDK } from '@stump/client'
import { AspectRatio, cn, usePrevious } from '@stump/components'
import { ReadingDirection } from '@stump/graphql'
import { motion } from 'framer-motion'
import { forwardRef, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
	ItemProps,
	ListProps,
	ListRange,
	ScrollerProps,
	Virtuoso,
	VirtuosoHandle,
} from 'react-virtuoso'

import { EntityImage } from '@/components/entity'
import { useBookPreferences } from '@/scenes/book/reader/useBookPreferences'

import { useImageBaseReaderContext } from '../context'

export default function ReaderFooter() {
	const { sdk } = useSDK()
	const { book, currentPage, setCurrentPage } = useImageBaseReaderContext()
	const {
		settings: { showToolBar, preload },
		bookPreferences: { readingDirection },
	} = useBookPreferences({ book })

	const virtuosoRef = useRef<VirtuosoHandle>(null)

	const [range, setRange] = useState<ListRange>({ endIndex: 0, startIndex: 0 })

	/**
	 * A range of pages to display in the Virtuoso component, based on the current page
	 * and the reading direction (since RTL means we want to scroll in reverse)
	 */
	const pageArray = useMemo(
		() =>
			Array.from({ length: book.pages }).map((_, index) =>
				readingDirection === ReadingDirection.Rtl ? book.pages - index : index + 1,
			),
		[book.pages, readingDirection],
	)

	const getRelativePage = useCallback((idx: number) => pageArray[idx] ?? idx, [pageArray])

	const previousPage = usePrevious(currentPage)
	/**
	 * An effect to scroll the Virtuoso component to the current page
	 * is close to exiting the view.
	 */
	useEffect(() => {
		const pageAsIndex = getRelativePage(currentPage)
		const { startIndex, endIndex } = range

		const endThresholdMet = startIndex <= pageAsIndex
		const startThresholdMet = endIndex >= pageAsIndex
		const pageIsInView = startThresholdMet && endThresholdMet

		if (!pageIsInView && previousPage !== currentPage) {
			virtuosoRef.current?.scrollIntoView({
				align: 'center',
				behavior: 'smooth',
				index: pageAsIndex,
			})
		}
	}, [currentPage, previousPage, range, getRelativePage, pageArray])

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
				data={pageArray.map((page) => sdk.media.bookPageURL(book.id, page))}
				components={{
					Item,
					List,
					Scroller,
				}}
				rangeChanged={setRange}
				itemContent={(idx, url) => {
					return (
						<AspectRatio
							onClick={() => setCurrentPage(getRelativePage(idx))}
							ratio={2 / 3}
							className={cn(
								'flex cursor-pointer items-center overflow-hidden rounded-md border-2 border-solid border-transparent shadow-xl transition duration-300 hover:border-edge-brand',
								{
									'border-edge-brand': currentPage === getRelativePage(idx),
								},
							)}
						>
							<EntityImage src={url} className="object-cover" />
						</AspectRatio>
					)
				}}
				overscan={{ main: preload.ahead || 1, reverse: preload.behind || 1 }}
				initialTopMostItemIndex={
					readingDirection === ReadingDirection.Rtl ? book.pages - currentPage : currentPage
				}
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
