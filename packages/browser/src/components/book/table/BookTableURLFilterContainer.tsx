import { cn } from '@stump/components'
import React, { PropsWithChildren } from 'react'
import AutoSizer from 'react-virtualized-auto-sizer'

import { TablePaginationProps } from '@/components/table'
import { usePreferences } from '@/hooks'

import BookTableColumnConfiguration from './BookTableColumnConfiguration'
import BookTablePagination from './BookTablePagination'

type Props = PropsWithChildren<TablePaginationProps>

export default function BookTableURLFilterContainer({ children, ...paginationProps }: Props) {
	const {
		preferences: { enable_hide_scrollbar },
	} = usePreferences()

	return (
		<div className="flex h-full w-full flex-col">
			<div className="flex-1 overflow-hidden">
				<AutoSizer>
					{({ height, width }) => (
						<div
							className={cn('h-full w-full overflow-auto', {
								'scrollbar-hide': enable_hide_scrollbar,
							})}
							style={{
								height,
								width,
							}}
						>
							{children}
						</div>
					)}
				</AutoSizer>
			</div>
			<div className="flex h-10 w-full items-center justify-between border-t border-edge px-4">
				<BookTableColumnConfiguration />
				<BookTablePagination {...paginationProps} />
			</div>
		</div>
	)
}
