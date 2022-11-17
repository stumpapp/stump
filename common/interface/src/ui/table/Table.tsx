import { Box, useColorModeValue } from '@chakra-ui/react';
import {
	ColumnDef,
	ColumnFiltersState,
	flexRender,
	getFilteredRowModel,
	getSortedRowModel,
	SortDirection,
	SortingState,
	TableOptions,
	useReactTable,
} from '@tanstack/react-table';
import clsx from 'clsx';
import { SortAscending, SortDescending } from 'phosphor-react';
import { useRef, useState } from 'react';
import { DebouncedInput } from '../Input';
import TablePagination from './Pagination';

export interface TableProps<T = unknown, V = unknown> {
	data: T[];
	columns: ColumnDef<T, V>[];
	options: Omit<TableOptions<T>, 'data' | 'columns'>;
	fullWidth?: boolean;
	searchable?: boolean;
	sortable?: boolean;
}

// TODO: loading state
export default function Table<T, V>({
	data,
	columns,
	options,
	searchable,
	sortable,
	...props
}: TableProps<T, V>) {
	const [sorting, setSorting] = useState<SortingState>([]);

	const filterColRef = useRef<HTMLSelectElement | null>(null);
	const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
	const [globalFilter, setGlobalFilter] = useState('');

	const table = useReactTable({
		...options,
		data,
		columns,
		state: {
			...options.state,
			sorting,
			columnFilters,
			globalFilter,
		},
		onSortingChange: setSorting,
		getSortedRowModel: getSortedRowModel(),
		onColumnFiltersChange: setColumnFilters,
		onGlobalFilterChange: setGlobalFilter,
		getFilteredRowModel: getFilteredRowModel(),
	});

	const headers = [{ id: 'GLOBAL_FILTER', header: 'All' }].concat(
		table
			.getAllColumns()
			.map((col) => col.columns.map((c) => ({ id: c.id, header: c.columnDef.header as string })))
			.flat(),
	);

	const { pageSize, pageIndex } = table.getState().pagination;

	const pageCount = table.getPageCount();
	const lastIndex = (pageIndex + 1) * pageSize;
	const firstIndex = lastIndex - (pageSize - 1);

	function handleFilter(value?: string) {
		const filterCol = filterColRef.current?.value;
		if (filterCol === 'GLOBAL_FILTER') {
			setGlobalFilter(value || '');
		} else if (filterCol) {
			table.getColumn(filterCol).setFilterValue(value);
		}
	}

	return (
		<Box
			bg={useColorModeValue('whiteAlpha.600', 'blackAlpha.300')}
			className="block max-w-full overflow-x-scroll overflow-y-hidden scrollbar-hide"
			rounded="md"
			p={3}
		>
			<table className={clsx({ 'w-full': props.fullWidth })}>
				<thead className="text-left">
					{table.getHeaderGroups().map((headerGroup) => (
						<tr key={headerGroup.id}>
							{headerGroup.headers.map((header) => {
								return (
									<th key={header.id} colSpan={header.colSpan}>
										<div
											className={clsx('flex items-center', {
												'cursor-pointer select-none': header.column.getCanSort() && sortable,
											})}
											onClick={sortable ? header.column.getToggleSortingHandler() : undefined}
										>
											{flexRender(header.column.columnDef.header, header.getContext())}
											{sortable && (
												<SortIcon
													direction={(header.column.getIsSorted() as SortDirection) ?? null}
												/>
											)}
										</div>
									</th>
								);
							})}
						</tr>
					))}
				</thead>
				<tbody className="divide-y">
					{table.getRowModel().rows.map((row) => {
						return (
							<tr key={row.id}>
								{row.getVisibleCells().map((cell) => {
									return (
										<td key={cell.id} className="py-2">
											{flexRender(cell.column.columnDef.cell, cell.getContext())}
										</td>
									);
								})}
							</tr>
						);
					})}
				</tbody>
			</table>
			<div className="h-2" />
			<div className="flex items-center justify-between">
				<div className="flex items-center space-x-2">
					<span className="flex items-center gap-1">
						<div>
							Showing <strong>{firstIndex}</strong> to <strong>{lastIndex}</strong>
						</div>
						of <strong>{table.getPageCount() * pageSize}</strong>
					</span>

					<select
						className="rounded-md text-sm py-0.5"
						value={pageSize}
						onChange={(e) => {
							table.setPageSize(Number(e.target.value));
						}}
					>
						{[10, 20, 30, 40, 50].map((pageSize) => (
							<option key={pageSize} value={pageSize}>
								Show {pageSize}
							</option>
						))}
					</select>

					{/* FIXME: scuffed */}
					{searchable && (
						<div className="relative rounded-md shadow-sm">
							<DebouncedInput
								placeholder="Filter"
								fullWidth
								className="pr-12"
								onInputStop={(value) => handleFilter(value)}
								size="sm"
								rounded="md"
							/>
							<div className="absolute inset-y-0 right-0 flex items-center">
								<select
									ref={filterColRef}
									id="currency"
									name="currency"
									className="appearance-none h-full rounded-md border-transparent bg-transparent py-0 px-4 text-sm text-center focus:outline-brand"
								>
									{headers.map((column) => (
										<option key={column.id} value={column.id}>
											{column.header}
										</option>
									))}
								</select>
							</div>
						</div>
					)}
				</div>

				<TablePagination
					currentPage={pageIndex + 1}
					pages={pageCount}
					onPageChange={(page) => table.setPageIndex(page)}
				/>
			</div>
		</Box>
	);
}

function SortIcon({ direction }: { direction: 'asc' | 'desc' | null }) {
	if (!direction) {
		return null;
	}

	return (
		<span className="ml-1.5">{direction === 'asc' ? <SortAscending /> : <SortDescending />}</span>
	);
}
