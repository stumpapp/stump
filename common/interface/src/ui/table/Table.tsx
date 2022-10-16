import { Box, useColorModeValue } from '@chakra-ui/react';
import { ColumnDef, flexRender, TableOptions, useReactTable } from '@tanstack/react-table';
import clsx from 'clsx';
import TablePagination from './Pagination';

export interface TableProps<T = unknown, V = unknown> {
	data: T[];
	columns: ColumnDef<T, V>[];
	options: Omit<TableOptions<T>, 'data' | 'columns'>;
	fullWidth?: boolean;
}

export default function Table<T, V>({ data, columns, options, ...props }: TableProps<T, V>) {
	const table = useReactTable({
		...options,
		data,
		columns,
		state: {
			...options.state,
		},
	});

	const { pageSize, pageIndex } = table.getState().pagination;

	const pageCount = table.getPageCount();
	const lastIndex = (pageIndex + 1) * pageSize;
	const firstIndex = lastIndex - (pageSize - 1);

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
										<div>{flexRender(header.column.columnDef.header, header.getContext())}</div>
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
