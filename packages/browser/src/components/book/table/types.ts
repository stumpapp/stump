import { OnChangeFn, SortingState } from '@tanstack/react-table'

type BookTableSorting =
	| {
			sorting: SortingState
			setSorting: OnChangeFn<SortingState>
	  }
	| {
			sorting?: never
			setSorting?: never
	  }

type BookTableSearch =
	| {
			globalFilter: string
	  }
	| {
			globalFilter?: never
	  }

type StateOptions = BookTableSorting & BookTableSearch

export type BookTableOptions = {
	enableMultiSort?: boolean
} & StateOptions
