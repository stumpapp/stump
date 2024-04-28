import { Series } from '@stump/types'
import { OnChangeFn, SortingState } from '@tanstack/react-table'
import React, { useCallback, useMemo } from 'react'

import { orderingToTableSort, tableSortToOrdering, useFilterContext } from '@/components/filters'
import { EntityTable, EntityTableProps } from '@/components/table'
import { useSeriesLayout } from '@/stores/layout'

import { defaultColumns } from './columns'

type Props = Omit<EntityTableProps<Series>, 'columns' | 'options'>

export default function SeriesTable(props: Props) {
	const configuration = useSeriesLayout((state) => ({
		columns: state.columns,
	}))
	const { ordering, setOrdering } = useFilterContext()

	const columns = useMemo(
		() => (configuration.columns?.length ? configuration.columns : defaultColumns),
		[configuration.columns],
	)

	const handleSetSorting: OnChangeFn<SortingState> = useCallback(
		(updater) => {
			if (typeof updater === 'function') {
				setOrdering(tableSortToOrdering(updater(orderingToTableSort(ordering))))
			} else {
				setOrdering(tableSortToOrdering(updater))
			}
		},
		[ordering, setOrdering],
	)

	const sorting = useMemo(() => orderingToTableSort(ordering), [ordering])

	return (
		<EntityTable
			columns={columns}
			options={{
				setSorting: handleSetSorting,
				sorting,
			}}
			{...props}
		/>
	)
}
