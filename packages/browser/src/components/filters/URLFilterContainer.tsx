import { cn } from '@stump/components'
import React, { forwardRef } from 'react'
import useScrollbarSize from 'react-scrollbar-size'
import { useMediaMatch } from 'rooks'

import { SIDEBAR_WIDTH } from '@/components/navigation/sidebar'
import { TablePaginationProps } from '@/components/table'
import { usePreferences } from '@/hooks'

import BookTablePagination from '../book/BookTablePagination'

type Props = {
	tableControls?: React.ReactNode
} & TablePaginationProps &
	Pick<React.HTMLAttributes<HTMLDivElement>, 'className' | 'children'>

// TODO: change name

const URLFilterContainer = forwardRef<HTMLDivElement, Props>(
	({ children, className, tableControls, ...paginationProps }, ref) => {
		const {
			preferences: { enable_hide_scrollbar, primary_navigation_mode },
		} = usePreferences()
		const { width } = useScrollbarSize()

		const isMobile = useMediaMatch('(max-width: 768px)')
		const scrollbarWidth = enable_hide_scrollbar ? 0 : width

		return (
			<div
				ref={ref}
				className={cn('flex flex-1 flex-col pb-24 md:pb-10', className)}
				id="urlFilterContainer"
			>
				{children}

				<div
					className="fixed bottom-0 flex h-12 items-center justify-between border-t border-edge bg-background px-4 md:h-10"
					style={{
						right: scrollbarWidth,
						width:
							isMobile || primary_navigation_mode === 'TOPBAR'
								? '100%'
								: `calc(100% - ${SIDEBAR_WIDTH}px - ${scrollbarWidth}px)`,
					}}
				>
					{tableControls ?? <div />}
					<BookTablePagination {...paginationProps} />
				</div>
			</div>
		)
	},
)
URLFilterContainer.displayName = 'URLFilterContainer'

export default URLFilterContainer
