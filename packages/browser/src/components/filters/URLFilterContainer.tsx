import { useFooterOffsetStore } from '@stump/client'
import { cn } from '@stump/components'
import { forwardRef, useEffect, useMemo } from 'react'
import useScrollbarSize from 'react-scrollbar-size'
import { useMediaMatch } from 'rooks'
import { create } from 'zustand'

import { SIDEBAR_WIDTH } from '@/components/navigation/sidebar'
import { TablePaginationProps } from '@/components/table'
import { usePreferences } from '@/hooks'

import URLPageSize from './URLPageSize'
import URLPagination from './URLPagination'

type Props = {
	tableControls?: React.ReactNode
} & TablePaginationProps &
	Pick<React.HTMLAttributes<HTMLDivElement>, 'className' | 'children'>

// FIXME: Looks awkward with TopBar layout because the constrained width... I think this just means the top-level
// container should be moved lower in the tree for any explore-like routes...
// However, this is also dependent on the width limit imposed by the user preference
const URLFilterContainer = forwardRef<HTMLDivElement, Props>(
	({ children, className, tableControls, ...paginationProps }, ref) => {
		const {
			preferences: { enableHideScrollbar, primaryNavigationMode },
		} = usePreferences()
		const { width } = useScrollbarSize()
		const { storedWidth, storeWidth } = useWidthStore((state) => ({
			storeWidth: state.setWidth,
			storedWidth: state.width,
		}))

		const storeOffset = useFooterOffsetStore((state) => state.setFooterOffset)

		/**
		 * An effect to update the stored width with any *non-zero* width value.
		 * This is necessary because the scrollbar width flickers between 0 and the
		 * actual width. A bit annoying
		 */
		useEffect(() => {
			if (width && storedWidth !== width) {
				storeWidth(width)
			}
		}, [storedWidth, storeWidth, width])

		useEffect(() => {
			storeOffset(48)
			return () => {
				storeOffset(0)
			}
		}, [storeOffset])

		/**
		 * A computed width which factors the actual scroll state of the main content.
		 * If the main content has a scroll height greater than the client height, we
		 * can safely assume that the scrollbar is visible and we should account for it.
		 */
		const adjustedWidth = useMemo(() => {
			const scrollRoot = document.getElementById('main')
			const scrollRootScrollHeight = scrollRoot?.scrollHeight ?? 0
			const scrollRootClientHeight = scrollRoot?.clientHeight ?? 0
			const hasScroll = scrollRootScrollHeight > scrollRootClientHeight

			return hasScroll ? width || storedWidth : 0
		}, [width, storedWidth])

		const isMobile = useMediaMatch('(max-width: 768px)')
		/**
		 * The value used for computing the right position of the pagination controls.
		 * If the scrollbar is hidden, we don't need to account for it.
		 */
		const scrollbarWidth = enableHideScrollbar ? 0 : adjustedWidth

		return (
			<div
				ref={ref}
				className={cn('flex flex-1 flex-col overflow-x-auto pb-24 md:pb-10', className)}
				id="urlFilterContainer"
			>
				{children}

				<div
					className="fixed bottom-0 flex h-12 items-center justify-between border-t border-edge bg-background px-4 md:h-10"
					data-testid="urlFilterFooter"
					style={{
						right: scrollbarWidth,
						width:
							isMobile || primaryNavigationMode === 'TOPBAR'
								? '100%'
								: `calc(100% - ${SIDEBAR_WIDTH}px - ${scrollbarWidth}px)`,
					}}
				>
					<div className="flex shrink-0 items-center gap-x-2">
						{tableControls}
						<URLPageSize />
					</div>
					<URLPagination {...paginationProps} />
				</div>
			</div>
		)
	},
)
URLFilterContainer.displayName = 'URLFilterContainer'

export default URLFilterContainer

type WidthStore = {
	width: number
	setWidth: (width: number) => void
}
const useWidthStore = create<WidthStore>((set) => ({
	setWidth: (width) => set({ width }),
	width: 0,
}))
