import { useSDK } from '@stump/client'
import { cn, ProgressBar, Text, usePrevious } from '@stump/components'
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
	const { book, currentPage, setCurrentPage, pageDimensions, setDimensions, pageSets } =
		useImageBaseReaderContext()
	const {
		settings: { showToolBar, preload },
		bookPreferences: { readingDirection },
	} = useBookPreferences({ book })

	const virtuosoRef = useRef<VirtuosoHandle>(null)

	const [range, setRange] = useState<ListRange>({ endIndex: 0, startIndex: 0 })

	const currentPageSetIdx = useMemo(
		() => pageSets.findIndex((set) => set.includes(currentPage - 1)),
		[currentPage, pageSets],
	)

	// TODO: remove this shit
	/**
	 * A range of pages to display in the Virtuoso component, based on the current page
	 * and the reading direction (since RTL means we want to scroll in reverse)
	 */
	const pageArray = useMemo(
		() =>
			Array.from({ length: book.pages }).map((_, index) =>
				readingDirection === 'rtl' ? book.pages - index : index + 1,
			),
		[book.pages, readingDirection],
	)

	// TODO: remove this shit
	const getRelativePage = useCallback((idx: number) => pageArray[idx] ?? idx, [pageArray])

	const previousPage = usePrevious(currentPage)
	/**
	 * An effect to scroll the Virtuoso component to the current page
	 * is close to exiting the view.
	 */
	useEffect(() => {
		const { startIndex, endIndex } = range

		const endThresholdMet = startIndex <= currentPageSetIdx
		const startThresholdMet = endIndex >= currentPageSetIdx
		const pageIsInView = startThresholdMet && endThresholdMet

		if (!pageIsInView && previousPage !== currentPage) {
			virtuosoRef.current?.scrollIntoView({
				align: 'center',
				behavior: 'smooth',
				index: currentPageSetIdx,
			})
		}
	}, [currentPage, previousPage, range, currentPageSetIdx])

	const renderItem = useCallback(
		(idx: number, indexes: number[]) => {
			return (
				<div className="flex items-center">
					{indexes.map((index) => {
						const url = sdk.media.bookPageURL(book.id, getRelativePage(index))
						const imageSize = pageDimensions[index]
						const isPortraitOrUnknown = !imageSize || imageSize.ratio < 1

						return (
							<div className="flex flex-col gap-1" key={index}>
								<div
									onClick={() => setCurrentPage(getRelativePage(index))}
									className={cn(
										'flex cursor-pointer items-center overflow-hidden rounded-md border-2 border-solid border-transparent shadow-xl transition duration-300 hover:border-edge-brand',
										{
											'border-edge-brand': idx === currentPageSetIdx,
										},
									)}
									style={{
										width: isPortraitOrUnknown ? 100 : 150,
										height: isPortraitOrUnknown ? 150 : 100,
									}}
								>
									<EntityImage
										src={url}
										className="object-contain"
										onLoad={({ height, width }) =>
											setDimensions((prev) => ({
												...prev,
												[index]: {
													height,
													width,
													ratio: width / height,
												},
											}))
										}
									/>
								</div>
								<Text className="text-center text-xs text-[#898d94]">{getRelativePage(index)}</Text>
							</div>
						)
					})}
				</div>
			)
		},
		[pageDimensions, sdk, book.id, getRelativePage, setCurrentPage, setDimensions, currentPage],
	)

	return (
		<motion.nav
			initial={false}
			animate={showToolBar ? 'visible' : 'hidden'}
			variants={transition}
			transition={{ duration: 0.2, ease: 'easeInOut' }}
			className="fixed bottom-0 left-0 z-[100] flex h-[200px] w-full flex-col gap-2 overflow-hidden bg-opacity-75 text-white shadow-lg"
		>
			<Virtuoso
				ref={virtuosoRef}
				style={{ height: '100%' }}
				horizontalDirection
				data={pageSets}
				components={{
					Item,
					List,
					Scroller,
				}}
				rangeChanged={setRange}
				itemContent={renderItem}
				overscan={{ main: preload.ahead || 1, reverse: preload.behind || 1 }}
				initialTopMostItemIndex={
					readingDirection === 'rtl' ? pageSets.length - currentPageSetIdx : currentPageSetIdx
				}
			/>

			<div className="w-full px-4 pb-4">
				<ProgressBar
					size="sm"
					value={40}
					max={book.pages}
					className="bg-[#898d94]"
					indicatorClassName="bg-[#f5f3ef]"
				/>
			</div>
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

const Item = forwardRef<HTMLDivElement, ItemProps<number[]>>(
	({ children, style, ...props }, ref) => {
		return (
			<div
				className="flex items-center px-1"
				ref={ref}
				{...props}
				style={{
					...style,
				}}
			>
				{children}
			</div>
		)
	},
)
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
