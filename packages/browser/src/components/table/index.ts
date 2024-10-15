export {
	default as EntityTable,
	type EntityTableOptions,
	type EntityTableProps,
} from './EntityTable'
export { default as EntityTableColumnConfiguration } from './EntityTableColumnConfiguration'
export { default as TablePagination, type TablePaginationProps } from './Pagination'
export { default as SortIcon } from './SortIcon'
export { getTableModels, default as Table } from './Table'

import { ColumnDef as ReactColumnDef } from '@tanstack/react-table'

// Note: bug in the types for ColumnDef in @tanstack/react-table
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ColumnDef<T> = ReactColumnDef<T, any>
