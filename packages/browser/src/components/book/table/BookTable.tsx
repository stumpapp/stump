import { FragmentType } from '@stump/graphql'
import { OnChangeFn, SortingState } from '@tanstack/react-table'
import { useCallback, useMemo } from 'react'

import { orderingToTableSort, tableSortToOrdering, useFilterContext } from '@/components/filters'
import { EntityTable, EntityTableProps } from '@/components/table'
import { useBooksLayout } from '@/stores/layout'

import { BookCardFragment } from '../BookCard'
import { buildBookColumns } from '.'
import { defaultColumns } from './columns'

type Props = Omit<EntityTableProps<FragmentType<typeof BookCardFragment>>, 'columns'>

export default function BookTable(props: Props) {
	const configuration = useBooksLayout((state) => ({
		columns: state.columns,
	}))
	const { ordering, setOrdering } = useFilterContext()

	const columns = useMemo(
		() =>
			configuration.columns?.length ? buildBookColumns(configuration.columns) : defaultColumns,
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
