import { useSDK } from '@stump/client'
import { cn, ProgressBar, Text } from '@stump/components'
import dayjs from 'dayjs'
import { motion } from 'framer-motion'
import { forwardRef, useCallback, useEffect, useMemo, useRef } from 'react'
import { ItemProps, ListProps, ScrollerProps, Virtuoso, VirtuosoHandle } from 'react-virtuoso'

import { EntityImage } from '@/components/entity'
import { useBookPreferences } from '@/scenes/book/reader/useBookPreferences'
import { useBookReadTime } from '@/stores/reader'

import { useImageBaseReaderContext } from '../context'

const HEIGHT_MODIFIER = 2 / 3
const WIDTH_MODIFIER = 2 / 3

export default function ReaderFooter() {
	const { sdk } = useSDK()
	const { book, currentPage, setCurrentPage, pageDimensions, setDimensions, pageSets } =
		useImageBaseReaderContext()
	const {
		settings: { showToolBar, preload },
		bookPreferences: { readingDirection, trackElapsedTime },
	} = useBookPreferences({ book })
	const elapsedSeconds = useBookReadTime(book.id)

	const virtuosoRef = useRef<VirtuosoHandle>(null)

	const currentPageSetIdx = useMemo(
		() => pageSets.findIndex((set) => set.includes(currentPage - 1)),
		[currentPage, pageSets],
	)
	const currentSet = useMemo(
		() => pageSets.find((set) => set.includes(currentPage - 1)) || [currentPage - 1],
		[currentPage, pageSets],
	)

	useEffect(() => {
		if (showToolBar) {
			virtuosoRef.current?.scrollToIndex({
				align: 'center',
				behavior: 'smooth',
				index: currentPageSetIdx,
			})
		}
	}, [showToolBar, currentPageSetIdx])

	const formatDuration = useCallback(() => {
		if (elapsedSeconds <= 60) {
			return `${elapsedSeconds} seconds`
		} else if (elapsedSeconds <= 3600) {
			return dayjs.duration(elapsedSeconds, 'seconds').format('m [minutes] s [seconds]')
		} else {
			return dayjs
				.duration(elapsedSeconds, 'seconds')
				.format(`H [hour${elapsedSeconds >= 7200 ? 's' : ''}] m [minutes]`)
		}
	}, [elapsedSeconds])

	const renderItem = useCallback(
		(idx: number, indexes: number[]) => {
			return (
				<div className="flex h-full items-center">
					{indexes.map((index) => {
						const url = sdk.media.bookPageURL(book.id, index + 1)
						const imageSize = pageDimensions[index]
						const isPortraitOrUnknown = !imageSize || imageSize.ratio < 1
						const isCurrentSet = currentPageSetIdx === idx

						let containerSize = {
							width: isPortraitOrUnknown ? 100 : 150,
							height: isPortraitOrUnknown ? 150 : 100,
						}

						if (isCurrentSet) {
							containerSize = {
								height: containerSize.height / HEIGHT_MODIFIER,
								width: containerSize.width / WIDTH_MODIFIER,
							}
						}

						return (
							<div className="flex flex-1 flex-col gap-1" key={index}>
								<div
									onClick={() => setCurrentPage(index + 1)}
									className={cn(
										'flex cursor-pointer items-center overflow-hidden rounded-md border-2 border-solid border-transparent shadow-xl transition duration-300 hover:border-edge-brand',
										{
											'border-edge-brand': isCurrentSet,
										},
									)}
									style={{
										...containerSize,
										transform: isCurrentSet ? 'translateY(-10px)' : 'translateY(0px)',
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
								{!isCurrentSet && (
									<Text className="text-center text-xs text-[#898d94]">{index + 1}</Text>
								)}
							</div>
						)
					})}
				</div>
			)
		},
		[pageDimensions, sdk, book.id, setCurrentPage, setDimensions, currentPageSetIdx],
	)

	return (
		<motion.nav
			initial={false}
			animate={showToolBar ? 'visible' : 'hidden'}
			variants={transition}
			transition={{ duration: 0.2, ease: 'easeInOut' }}
			className="fixed bottom-0 left-0 z-[100] flex w-full flex-col justify-end gap-2 overflow-hidden bg-opacity-75 text-white shadow-lg"
			style={{
				height: 215 / HEIGHT_MODIFIER,
			}}
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
				itemContent={renderItem}
				overscan={{ main: preload.ahead || 1, reverse: preload.behind || 1 }}
				initialTopMostItemIndex={
					readingDirection === 'rtl' ? pageSets.length - currentPageSetIdx : currentPageSetIdx
				}
			/>

			<div className="flex w-full flex-col gap-2 px-4 pb-4">
				<ProgressBar
					size="sm"
					value={currentPage}
					max={book.pages}
					className="bg-[#0c0c0c]"
					indicatorClassName="bg-[#898d94]"
					inverted={readingDirection === 'rtl'}
				/>

				<div
					className={cn('flex flex-row justify-between', { 'justify-around': !trackElapsedTime })}
				>
					{trackElapsedTime && (
						<Text className="text-sm text-[#898d94]">Reading time: {formatDuration()}</Text>
					)}

					<Text className="text-sm text-[#898d94]">
						{currentSet.map((idx) => idx + 1).join('-')} of {book.pages}
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
				className="flex flex-1 select-none items-center px-1"
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
