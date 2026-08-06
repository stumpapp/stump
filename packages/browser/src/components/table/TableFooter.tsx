import { NativeSelect, Text } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import { PaginationState } from '@tanstack/react-table'

import TablePagination from './Pagination'

type Props = {
	pagination: PaginationState
	setPagination: (pagination: PaginationState) => void
	pageCount: number
	dataCount: number
}

export default function TableFooter({ pagination, setPagination, pageCount, dataCount }: Props) {
	const { t } = useLocaleContext()
	const firstIndex = pagination.pageIndex * pagination.pageSize + 1
	const lastIndex = Math.min(firstIndex + pagination.pageSize - 1, dataCount)

	const { pageIndex, pageSize } = pagination

	return (
		<div className="h-10 px-2 flex items-center justify-between border-t border-border">
			<div className="gap-4 flex items-center">
				<Text variant="muted" className="gap-1 md:flex hidden shrink-0 items-center" size="sm">
					{t('controlUi.tableRange', { first: firstIndex, last: lastIndex, total: dataCount })}
				</Text>

				<NativeSelect
					disabled={!dataCount}
					size="xs"
					options={[5, 10, 20, 30, 40, 50].map((pageSize) => ({
						label: t('controlUi.showRows', { count: pageSize }),
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
