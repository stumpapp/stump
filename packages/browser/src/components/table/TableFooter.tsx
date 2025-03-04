import { NativeSelect, Text } from '@stump/components'
import { PaginationState } from '@tanstack/react-table'

import TablePagination from './Pagination'

type Props = {
	pagination: PaginationState
	setPagination: (pagination: PaginationState) => void
	pageCount: number
	dataCount: number
}

export default function TableFooter({ pagination, setPagination, pageCount, dataCount }: Props) {
	const firstIndex = pagination.pageIndex * pagination.pageSize + 1
	const lastIndex = Math.min(firstIndex + pagination.pageSize - 1, dataCount)

	const { pageIndex, pageSize } = pagination

	return (
		<div className="flex h-10 items-center justify-between border-t border-edge px-2">
			<div className="flex items-center gap-4">
				<Text variant="muted" className="hidden flex-shrink-0 items-center gap-1 md:flex" size="sm">
					<span>
						<strong>{firstIndex}</strong> to <strong>{lastIndex}</strong>
					</span>
					of <strong>{dataCount}</strong>
				</Text>

				<NativeSelect
					disabled={!dataCount}
					size="xs"
					options={[5, 10, 20, 30, 40, 50].map((pageSize) => ({
						label: `Show ${pageSize} rows`,
						// FIXME: don't cast once my select can consume numbers :nomnom:
						value: pageSize.toString(),
					}))}
					value={pageSize.toString()}
					onChange={(e) => {
						const parsed = parseInt(e.target.value, 10)
						if (!isNaN(parsed) && parsed > 0) {
							setPagination({ ...pagination, pageSize: parsed })
						}
					}}
				/>
			</div>

			<TablePagination
				currentPage={pageIndex + 1}
				pages={pageCount}
				onChangePage={(page) => setPagination({ ...pagination, pageIndex: page - 1 })}
			/>
		</div>
	)
}
