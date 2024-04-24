import { OnChangeFn, SortingState } from '@tanstack/react-table'

type SeriesTableSorting =
	| {
			sorting: SortingState
			setSorting: OnChangeFn<SortingState>
	  }
	| {
			sorting?: never
			setSorting?: never
	  }

type SeriesTableSearch =
	| {
			globalFilter: string
	  }
	| {
			globalFilter?: never
	  }

type StateOptions = SeriesTableSorting & SeriesTableSearch

export type SeriesTableOptions = {
	enableMultiSort?: boolean
} & StateOptions
