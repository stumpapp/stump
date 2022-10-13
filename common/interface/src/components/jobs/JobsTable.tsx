import { ColumnDef, flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table';
import { useMemo } from 'react';
import { JobReport, useJobReport } from '@stump/client';
import { readableKind } from './utils';
import { Box, useColorModeValue } from '@chakra-ui/react';

// interface JobReport {
// 	id: string | null;
// 	kind: string;
// 	details: string | null;
// 	status: JobStatus;
// 	task_count: number | null;
// 	completed_task_count: number | null;
// 	ms_elapsed: bigint | null;
// 	completed_at: string | null;
// }

// TODO: once I understand react-table more, extract this into a separate component
// in  `ui` folder... -> https://tanstack.com/table/v8/docs/guide/overview
export default function JobsTable() {
	const { isLoading, jobReports } = useJobReport();

	const columns = useMemo<ColumnDef<JobReport>[]>(
		() => [
			{
				id: 'jobHistory',
				columns: [
					{
						accessorKey: 'id',
						header: 'Job ID',
						cell: (info) => info.getValue(),
						footer: (props) => props.column.id,
					},
					{
						accessorKey: 'kind',
						header: 'Type',
						cell: (info) => readableKind(info.getValue()),
						footer: (props) => props.column.id,
					},
					// {
					// 	accessorFn: (row) => row.lastName,
					// 	id: 'lastName',
					// 	cell: (info) => info.getValue(),
					// 	header: () => <span>Last Name</span>,
					// 	footer: (props) => props.column.id,
					// },
				],
			},
		],
		[],
	);

	// const pagination = useMemo(
	// 	() => ({
	// 		pageIndex,
	// 		pageSize,
	// 	}),
	// 	[pageIndex, pageSize],
	// );

	const table = useReactTable({
		data: jobReports ?? [],
		columns,
		// pageCount: dataQuery.data?.pageCount ?? -1,
		state: {
			// pagination,
		},
		// onPaginationChange: setPagination,
		getCoreRowModel: getCoreRowModel(),
		// manualPagination: true,
		// getPaginationRowModel: getPaginationRowModel(), // If only doing manual pagination, you don't need this
		debugTable: true,
	});

	return (
		<Box bg={useColorModeValue('whiteAlpha.600', 'blackAlpha.300')} rounded="md" p={3}>
			<table>
				<thead>
					{table.getHeaderGroups().map((headerGroup) => (
						<tr key={headerGroup.id}>
							{headerGroup.headers.map((header) => {
								return (
									<th key={header.id} colSpan={header.colSpan}>
										{header.isPlaceholder ? null : (
											<div>{flexRender(header.column.columnDef.header, header.getContext())}</div>
										)}
									</th>
								);
							})}
						</tr>
					))}
				</thead>
				<tbody>
					{table.getRowModel().rows.map((row) => {
						return (
							<tr key={row.id}>
								{row.getVisibleCells().map((cell) => {
									return (
										<td key={cell.id}>
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
			<div className="flex items-center gap-2">
				<button
					className="border rounded p-1"
					onClick={() => table.setPageIndex(0)}
					disabled={!table.getCanPreviousPage()}
				>
					{'<<'}
				</button>
				<button
					className="border rounded p-1"
					onClick={() => table.previousPage()}
					disabled={!table.getCanPreviousPage()}
				>
					{'<'}
				</button>
				<button
					className="border rounded p-1"
					onClick={() => table.nextPage()}
					disabled={!table.getCanNextPage()}
				>
					{'>'}
				</button>
				<button
					className="border rounded p-1"
					onClick={() => table.setPageIndex(table.getPageCount() - 1)}
					disabled={!table.getCanNextPage()}
				>
					{'>>'}
				</button>
				<span className="flex items-center gap-1">
					<div>Page</div>
					<strong>
						{table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
					</strong>
				</span>
				<span className="flex items-center gap-1">
					| Go to page:
					<input
						type="number"
						defaultValue={table.getState().pagination.pageIndex + 1}
						onChange={(e) => {
							const page = e.target.value ? Number(e.target.value) - 1 : 0;
							table.setPageIndex(page);
						}}
						className="border p-1 rounded w-16"
					/>
				</span>
				<select
					value={table.getState().pagination.pageSize}
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
				{isLoading ? 'Loading...' : null}
			</div>
			<div>{table.getRowModel().rows.length} Rows</div>

			{/* <pre>{JSON.stringify(pagination, null, 2)}</pre> */}
		</Box>
	);
}
