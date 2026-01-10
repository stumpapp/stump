import { cn } from '@stump/components'
import { forwardRef, memo, useCallback, useRef, useState } from 'react'
import { browserName, isSafari } from 'react-device-detect'
import { useHotkeys } from 'react-hotkeys-hook'
import { Hotkey } from 'react-hotkeys-hook/dist/types'
import AutoSizer from 'react-virtualized-auto-sizer'
import { FixedSizeList as List, ListChildComponentProps } from 'react-window'

import { useBookPreferences } from '@/scenes/book/reader/useBookPreferences'

import { useImageBaseReaderContext } from '../context'
import PageSet from './PageSet'

type Props = {
	/**
	 * The initial page to start on, if any
	 */
	initialPage?: number
	/**
	 * A callback to report when the page has changed
	 */
	onPageChanged(page: number): void
}

function AnimatedPagedReader({ initialPage = 1, onPageChanged }: Props) {
	const { pageSets, book } = useImageBaseReaderContext()
	const {
		bookPreferences: { tapSidesToNavigate },
		settings: { showToolBar },
		setSettings,
	} = useBookPreferences({ book })

	const [currentPage, setCurrentPage] = useState(() => initialPage)
	const [initialIdx] = useState(() => pageSets.findIndex((set) => set.includes(initialPage - 1)))

	const listRef = useRef<List>(null)

	const handleLeftwardPageChange = useCallback(() => {
		const currentSetIdx = pageSets.findIndex((set) => set.includes(currentPage - 1))
		const nextSetIdx = currentSetIdx - 1
		const nextSet = pageSets[nextSetIdx]
		const endOfNextSet = nextSet?.at(-1)

		// TODO: Add the panning stuff
		if (!nextSet || endOfNextSet == null) {
			return
		}

		if (nextSetIdx >= 0 && nextSetIdx < pageSets.length) {
			const newPage = endOfNextSet + 1
			setCurrentPage(newPage)
			onPageChanged?.(newPage)
			listRef.current?.scrollToItem(nextSetIdx, 'start')
		}
	}, [pageSets, currentPage, onPageChanged])

	const handleRightwardPageChange = useCallback(() => {
		const currentSetIdx = pageSets.findIndex((set) => set.includes(currentPage - 1))

		const nextSetIdx = currentSetIdx + 1
		const nextSet = pageSets[nextSetIdx]
		const startOfNextSet = nextSet?.at(0)

		// TODO: Add the panning stuff
		if (!nextSet || startOfNextSet == null) {
			return
		}

		if (nextSetIdx >= 0 && nextSetIdx < pageSets.length) {
			const newPage = startOfNextSet + 1
			setCurrentPage(newPage)
			onPageChanged?.(newPage)
			listRef.current?.scrollToItem(nextSetIdx, 'start')
		}
	}, [pageSets, currentPage, onPageChanged])

	const navigateToPage = useCallback(
		(direction: 'left' | 'right') => {
			if (direction === 'left') {
				handleLeftwardPageChange()
			} else {
				handleRightwardPageChange()
			}
		},
		[handleLeftwardPageChange, handleRightwardPageChange],
	)

	const hotKeyHandler = useCallback(
		(hotkey: Hotkey) => {
			const targetKey = hotkey.keys?.at(0)
			switch (targetKey) {
				case 'right':
					navigateToPage('right')
					break
				case 'left':
					navigateToPage('left')
					break
				case 'space':
					setSettings({
						showToolBar: !showToolBar,
					})
					break
				case 'escape':
					setSettings({
						showToolBar: false,
					})
					break
				default:
					break
			}
		},
		[navigateToPage, setSettings, showToolBar],
	)

	useHotkeys('right, left, space, escape', (_, handler) => hotKeyHandler(handler))

	// Side navigation click handlers
	const handleSideClick = useCallback(
		(direction: 'left' | 'right') => {
			navigateToPage(direction)
		},
		[navigateToPage],
	)

	return (
		<div className="relative h-full w-full bg-background-surface">
			{tapSidesToNavigate && (
				<>
					<SideBarControl onClick={() => handleSideClick('left')} position="left" />
					<SideBarControl onClick={() => handleSideClick('right')} position="right" />
				</>
			)}

			<div className="h-full w-full">
				<AutoSizer>
					{({ height, width }) => {
						const initialOffset = initialIdx > -1 ? initialIdx * width : 0
						return (
							<List
								ref={listRef}
								height={height}
								width={width}
								layout="horizontal"
								itemCount={pageSets.length}
								itemSize={width}
								itemData={pageSets}
								overscanCount={5}
								style={{
									// Note: This just does NOT work well on Safari. When in Tauri, it shows as WebKit
									scrollSnapType: isSafari || browserName === 'WebKit' ? undefined : 'x mandatory',
									scrollBehavior: 'smooth',
								}}
								className="overflow-x-auto overflow-y-hidden"
								initialScrollOffset={initialOffset}
							>
								{ItemRenderer}
							</List>
						)
					}}
				</AutoSizer>
			</div>
		</div>
	)
}

export default memo(AnimatedPagedReader)

const ItemRenderer = forwardRef<HTMLDivElement, ListChildComponentProps>(
	({ index, style }, ref) => {
		const { pageSets, getPageUrl, toggleToolbar } = useImageBaseReaderContext()

		const pageSet = pageSets[index]

		if (!pageSet) {
			return <div style={style} />
		}

		return (
			<div
				ref={ref}
				key={`animated-page-${index}-${pageSet.join('-')}`}
				style={{
					...style,
					scrollSnapAlign: 'start',
				}}
				className="flex h-full w-full items-center justify-center"
			>
				<ReactWindowPageSetWrapper
					pageSet={pageSet}
					getPageUrl={getPageUrl}
					onPageClick={toggleToolbar}
				/>
			</div>
		)
	},
)
ItemRenderer.displayName = 'ItemRenderer'

type ReactWindowPageSetWrapperProps = {
	pageSet: number[]
	getPageUrl: (page: number) => string
	onPageClick: () => void
}

/**
 * A wrapper component that uses the existing PageSet component with react-window.
 * It takes a pageSet array and renders a PageSet for the first page in the set.
 */
const ReactWindowPageSetWrapper = memo(
	({ pageSet, getPageUrl, onPageClick }: ReactWindowPageSetWrapperProps) => {
		// Use the first page in the set as the current page for PageSet
		const currentPage = (pageSet[0] ?? 0) + 1 // Convert from 0-indexed to 1-indexed

		return <PageSet currentPage={currentPage} getPageUrl={getPageUrl} onPageClick={onPageClick} />
	},
)

ReactWindowPageSetWrapper.displayName = 'ReactWindowPageSetWrapper'

type SideBarControlProps = {
	onClick: () => void
	position: 'left' | 'right'
}

function SideBarControl({ onClick, position }: SideBarControlProps) {
	return (
		<div
			className={cn(
				'absolute z-50 h-full w-[15%] border border-transparent transition-all duration-300',
				'active:border-edge-subtle active:bg-background-surface active:bg-opacity-50',
				{ 'right-0': position === 'right' },
				{ 'left-0': position === 'left' },
			)}
			onClick={onClick}
		/>
	)
}
