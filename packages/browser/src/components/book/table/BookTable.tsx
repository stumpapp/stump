import { CheckBox } from '@stump/components'
import { FragmentType, useFragment, UserPermission } from '@stump/graphql'
import { ColumnDef, OnChangeFn, SortingState } from '@tanstack/react-table'
import { useCallback, useMemo } from 'react'
import { useShallow } from 'zustand/react/shallow'

import { orderingToTableSort, tableSortToOrdering, useFilterContext } from '@/components/filters'
import { EntityTable, EntityTableProps } from '@/components/table'
import { useAppContext } from '@/context'
import { useBooksLayout } from '@/stores/layout'

import { BookCardFragment } from '../BookCard'
import useKoboSync from '../useKoboSync'
import { buildBookColumns } from '.'
import { defaultColumns } from './columns'

type Props = Omit<EntityTableProps<FragmentType<typeof BookCardFragment>>, 'columns'> & {
	layoutKey?: string
}

// Note: I needed global for book search page
export default function BookTable({ layoutKey = 'global', ...props }: Props) {
	const books = useFragment(BookCardFragment, props.items)
	const { checkPermission } = useAppContext()
	const canAccessKobo = checkPermission(UserPermission.AccessKoboSync)
	const { mutate: setKoboSync, isPending: isUpdatingKoboSync } = useKoboSync()

	const configuration = useBooksLayout(
		layoutKey,
		useShallow((state) => ({
			columns: state.columns,
		})),
	)
	const { ordering, setOrdering } = useFilterContext()

	const koboColumn = useMemo<ColumnDef<FragmentType<typeof BookCardFragment>>>(() => {
		const epubBooks = books.filter((book) => book.extension.toLowerCase() === 'epub')
		const allSelected =
			epubBooks.length > 0 && epubBooks.every((book) => book.isSelectedForKoboSync)
		const someSelected = epubBooks.some((book) => book.isSelectedForKoboSync)
		const headerLabel = `${allSelected ? 'Remove' : 'Sync'} all EPUBs on this page ${allSelected ? 'from' : 'to'} Kobo`

		return {
			id: 'kobo-sync',
			header: () => (
				<CheckBox
					id="kobo-sync-all"
					label="Kobo"
					aria-label={headerLabel}
					title={headerLabel}
					checked={allSelected ? true : someSelected ? 'indeterminate' : false}
					disabled={!epubBooks.length || isUpdatingKoboSync}
					onCheckedChange={() =>
						setKoboSync({
							mediaIds: epubBooks.map((book) => book.id),
							isSelected: !allSelected,
						})
					}
				/>
			),
			cell: ({ row }) => {
				const book = books[row.index]
				if (!book || book.extension.toLowerCase() !== 'epub') return null

				return (
					<CheckBox
						id={`kobo-sync-${book.id}`}
						aria-label={`${book.isSelectedForKoboSync ? 'Remove' : 'Sync'} ${book.resolvedName} ${book.isSelectedForKoboSync ? 'from' : 'to'} Kobo`}
						checked={book.isSelectedForKoboSync}
						disabled={isUpdatingKoboSync}
						onCheckedChange={(checked) =>
							setKoboSync({ mediaIds: [book.id], isSelected: checked === true })
						}
					/>
				)
			},
			enableSorting: false,
			size: 72,
		}
	}, [books, isUpdatingKoboSync, setKoboSync])

	const columns = useMemo(() => {
		const bookColumns = configuration.columns?.length
			? buildBookColumns(configuration.columns)
			: defaultColumns
		return canAccessKobo ? [koboColumn, ...bookColumns] : bookColumns
	}, [canAccessKobo, configuration.columns, koboColumn])

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
