import { getMediaPage } from '@stump/api'
import { cx, Heading, IconButton } from '@stump/components'
import { Media } from '@stump/types'
import { defaultRangeExtractor, Range, useVirtualizer } from '@tanstack/react-virtual'
import { motion } from 'framer-motion'
import { BookOpen, Scroll } from 'lucide-react'
import { ArrowLeft } from 'lucide-react'
import React, { PropsWithChildren, useCallback, useEffect, useMemo, useRef } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

import paths from '@/paths'
import { useReaderStore } from '@/stores'

type Props = {
	media: Media
	currentPage: number
	onPageChange?(page: number): void
}

const ReaderContainer = ({
	media: { id, pages, name, metadata },
	currentPage,
	onPageChange,
	children,
}: PropsWithChildren<Props>) => {
	const [search, setSearch] = useSearchParams()

	const parentRef = useRef<HTMLDivElement>(null)
	const rangeRef = useRef([0, 0])

	const { readerMode, setReaderMode, showToolBar } = useReaderStore((state) => ({
		readerMode: state.mode,
		setReaderMode: state.setMode,
		showToolBar: state.showToolBar,
	}))

	const columnVirtualizer = useVirtualizer({
		count: pages,
		enableSmoothScroll: true,
		estimateSize: () => 85,
		getScrollElement: () => parentRef.current,
		horizontal: true,
		initialOffset: useMemo(() => 85 * currentPage, [currentPage]),
		overscan: 1,
		rangeExtractor: useCallback((range: Range) => {
			rangeRef.current = [range.startIndex, range.endIndex]
			return defaultRangeExtractor(range)
		}, []),
	})

	const totalSize = columnVirtualizer.getTotalSize()
	useEffect(() => {
		if (showToolBar) {
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
	}, [showToolBar, currentPage, id, pages, totalSize])

	const handleChangeReaderMode = useCallback(() => {
		if (readerMode === 'continuous') {
			search.set('page', currentPage.toString())
			setSearch(search)
			setReaderMode('paged')
		} else {
			setReaderMode('continuous')
		}
	}, [readerMode, setReaderMode, currentPage, search, setSearch])

	const showBottomToolbar = readerMode !== 'continuous'
	const title = metadata?.title || name

	return (
		<React.Fragment>
			<motion.nav
				initial={false}
				animate={showToolBar ? 'visible' : 'hidden'}
				variants={variants('top')}
				transition={{ duration: 0.2, ease: 'easeInOut' }}
				className="fixed left-0 top-0 z-[100] w-full bg-sidebar/95 p-4 text-foreground"
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
						<IconButton
							size="sm"
							title={
								readerMode === 'continuous' ? 'Switch to paged mode' : 'Switch to continuous mode'
							}
							onClick={handleChangeReaderMode}
						>
							{readerMode === 'continuous' ? (
								<Scroll className="h-4 w-4" />
							) : (
								<BookOpen className="h-4 w-4" />
							)}
						</IconButton>
					</div>
				</div>
			</motion.nav>

			{children}

			{showBottomToolbar && (
				<motion.nav
					initial={false}
					animate={showToolBar ? 'visible' : 'hidden'}
					variants={variants('bottom')}
					transition={{ duration: 0.2, ease: 'easeInOut' }}
					className="fixed bottom-0 left-0 z-[100] w-full bg-opacity-75 text-white shadow-lg"
				>
					<div ref={parentRef} className="h-[150px] overflow-x-auto py-4 scrollbar-hide">
						<div
							className="relative inline-flex h-full"
							style={{
								width: `${columnVirtualizer.getTotalSize()}px`,
							}}
						>
							{columnVirtualizer.getVirtualItems().map((virtualItem) => {
								const page = virtualItem.index + 1
								const imageUrl = getMediaPage(id, page)

								return (
									<div
										className="z-[101]"
										key={virtualItem.key}
										style={{
											height: '100%',
											left: 0,
											position: 'absolute',
											top: 0,
											transform: `translateX(${virtualItem.start}px)`,
											width: `80px`,
										}}
									>
										<img
											id={`${id}-page-${page}`}
											key={virtualItem.key}
											src={imageUrl}
											className={cx(
												currentPage === page ? '-translate-y-1 border-brand' : 'border-transparent',
												'h-32 w-auto cursor-pointer rounded-md border-2 border-solid shadow-xl transition duration-300 hover:-translate-y-2 hover:border-brand',
											)}
											onClick={() => onPageChange?.(page)}
										/>
									</div>
								)
							})}
						</div>
					</div>
				</motion.nav>
			)}
		</React.Fragment>
	)
}

export default React.memo(ReaderContainer)

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
