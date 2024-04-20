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

	// return children

	return (
		<div className="flex h-full w-full flex-col pb-10">
			{children}

			<div className="fixed bottom-0 flex h-12 w-full items-center justify-between border-t border-edge bg-background px-4 md:h-10">
				<BookTableColumnConfiguration />
				<BookTablePagination {...paginationProps} />
			</div>
		</div>
	)

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
			<div className="fixed bottom-0 flex h-10 w-full items-center justify-between border-t border-edge px-4">
				<BookTableColumnConfiguration />
				<BookTablePagination {...paginationProps} />
			</div>
		</div>
	)
}
