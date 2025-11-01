import { useSDK } from '@stump/client'
import { cn, ProgressBar, Text, usePreviousIsDifferent } from '@stump/components'
import { ReadingDirection } from '@stump/graphql'
import { motion } from 'framer-motion'
import { Duration } from 'luxon'
import { forwardRef, useCallback, useEffect, useMemo, useRef } from 'react'
import { ItemProps, ScrollerProps, Virtuoso, VirtuosoHandle } from 'react-virtuoso'

import { EntityImage } from '@/components/entity'
import { usePreferences } from '@/hooks/usePreferences'
import { useBookPreferences } from '@/scenes/book/reader/useBookPreferences'
import { useBookReadTime } from '@/stores/reader'

import { useImageBaseReaderContext } from '../context'

const SIZE_MODIFIER = 1.5

export default function ReaderFooter() {
	const { sdk } = useSDK()
	const { book, currentPage, setCurrentPage, imageSizes, setPageSize, pageSets } =
		useImageBaseReaderContext()
	const {
		settings: { showToolBar, preload },
		bookPreferences: { readingDirection, trackElapsedTime },
	} = useBookPreferences({ book })
	const elapsedSeconds = useBookReadTime(book.id)
	const {
		preferences: { thumbnailRatio, locale },
	} = usePreferences()

	const virtuosoRef = useRef<VirtuosoHandle>(null)

	const currentPageSetIdx = useMemo(
		() => pageSets.findIndex((set) => set.includes(currentPage - 1)),
		[currentPage, pageSets],
	)
	const currentSet = useMemo(
		() => pageSets.find((set) => set.includes(currentPage - 1)) || [currentPage - 1],
		[currentPage, pageSets],
	)

	const showToolBarChanged = usePreviousIsDifferent(showToolBar)
	const readingDirectionChanged = usePreviousIsDifferent(readingDirection)
	useEffect(() => {
		if (showToolBar) {
			virtuosoRef.current?.scrollToIndex({
				align: 'center',
				behavior: showToolBarChanged || readingDirectionChanged ? 'auto' : 'smooth',
				index: currentPageSetIdx,
			})
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [showToolBar, currentPageSetIdx])

	const formatDuration = useCallback(() => {
		const duration = Duration.fromObject({ seconds: elapsedSeconds }).reconfigure({ locale })

		let formattedDuration
		if (elapsedSeconds <= 59) {
			formattedDuration = duration.shiftTo('seconds')
		} else if (elapsedSeconds <= 3599) {
			formattedDuration = duration.shiftTo('minutes', 'seconds')
		} else {
			const hms = duration.shiftTo('hours', 'minutes', 'seconds')
			formattedDuration = Duration.fromObject({ hours: hms.hours, minutes: hms.minutes })
		}

		return formattedDuration.toHuman()
	}, [elapsedSeconds, locale])

	const renderItem = useCallback(
		(idx: number, indexes: number[]) => {
			const isDoubleSpread = indexes.length === 2
			const isLandscape = indexes.some((page) => (imageSizes?.[page]?.ratio || 0) >= 1)
			const isCurrentSet = currentPageSetIdx === idx

			let pageSetSize = {
				width: 100,
				height: 100 / thumbnailRatio,
			}
			let containerSize

			if (isLandscape || isDoubleSpread) {
				pageSetSize = {
					height: pageSetSize.height,
					width: pageSetSize.width * 2,
				}
			}

			if (!isCurrentSet) {
				containerSize = {
					height: pageSetSize.height * SIZE_MODIFIER + 10, // add space for the translateY(-10px)
					width: pageSetSize.width,
				}
			} else {
				containerSize = {
					height: pageSetSize.height * SIZE_MODIFIER + 10, // add space for the translateY(-10px)
					width: pageSetSize.width * SIZE_MODIFIER,
				}
				pageSetSize = {
					height: pageSetSize.height * SIZE_MODIFIER,
					width: pageSetSize.width * SIZE_MODIFIER,
				}
			}

			return (
				<div className="flex flex-col justify-end" style={containerSize}>
					<div
						className={cn(
							'flex cursor-pointer overflow-hidden rounded-lg border-2 border-transparent shadow-xl transition duration-300 hover:border-edge-brand',
							{ 'rounded-[10px] border-edge-brand': isCurrentSet },
						)}
						style={{
							...pageSetSize,
							transform: isCurrentSet ? 'translateY(-10px)' : 'translateY(0px)',
						}}
					>
						{indexes.map((index) => (
							<EntityImage
								src={sdk.media.bookPageURL(book.id, index + 1)}
								className="h-full w-full object-cover"
								key={index}
								onLoad={({ height, width }) =>
									setPageSize(index, { height, width, ratio: width / height })
								}
								onClick={() => setCurrentPage(index + 1)}
							/>
						))}
					</div>
					{!isCurrentSet && (
						<Text size="sm" className="shrink-0 text-center text-[#898d94]">
							{[...indexes]
								.sort((a, b) => a - b)
								.map((i) => i + 1)
								.join('-')}
						</Text>
					)}
				</div>
			)
		},
		[imageSizes, sdk, book.id, setCurrentPage, setPageSize, currentPageSetIdx, thumbnailRatio],
	)

	return (
		<motion.nav
			initial={false}
			animate={showToolBar ? 'visible' : 'hidden'}
			variants={transition}
			transition={{ duration: 0.2, ease: 'easeInOut' }}
			// @ts-expect-error: It does have className?
			className="fixed bottom-0 left-0 z-[100] flex w-full flex-col justify-end gap-2 overflow-hidden bg-opacity-75 text-white shadow-lg"
		>
			<Virtuoso
				ref={virtuosoRef}
				style={{
					height:
						(100 / thumbnailRatio) * SIZE_MODIFIER + // item height (all items have the same fixed height)
						12 + // scrollbar vertical height
						10 + // translateY padding
						8, // add some vertical padding between the scrollbar and items
				}}
				horizontalDirection
				data={pageSets}
				components={{
					Item,
					Scroller,
				}}
				itemContent={renderItem}
				overscan={{ main: preload.ahead || 1, reverse: preload.behind || 1 }}
				initialTopMostItemIndex={
					readingDirection === ReadingDirection.Rtl
						? pageSets.length - currentPageSetIdx
						: currentPageSetIdx
				}
			/>

			<div className="flex w-full flex-col gap-2 px-4 pb-4">
				<ProgressBar
					size="sm"
					value={currentPage}
					max={book.pages}
					className="bg-[#0c0c0c]"
					indicatorClassName="bg-[#898d94]"
					inverted={readingDirection === ReadingDirection.Rtl}
				/>

				<div
					className={cn('flex flex-row justify-between', { 'justify-around': !trackElapsedTime })}
				>
					{trackElapsedTime && (
						<Text className="text-sm text-[#898d94]">Reading time: {formatDuration()}</Text>
					)}

					<Text className="text-sm text-[#898d94]">
						{[...currentSet]
							.map((idx) => idx + 1)
							.sort((a, b) => a - b)
							.join('-')}
						{' of '}
						{book.pages}
					</Text>
				</div>
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

const Item = forwardRef<HTMLDivElement, ItemProps<number[]>>(
	({ children, style, ...props }, ref) => {
		return (
			<div
				className="select-none px-1"
				ref={ref}
				{...props}
				style={{
					...style,
					verticalAlign: 'bottom',
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
