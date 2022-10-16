import { ColumnDef, getCoreRowModel, getPaginationRowModel } from '@tanstack/react-table';
import { useMemo } from 'react';
import { JobReport, JobStatus, useJobReport } from '@stump/client';
import { formatJobStatus, readableKind } from './utils';
import Table from '../../ui/table/Table';

// 	kind: string;
// 	details: string | null;
// 	status: JobStatus;
// 	task_count: number | null;
// 	completed_task_count: number | null;
// 	ms_elapsed: bigint | null;
// 	completed_at: string | null;

export default function JobsTable() {
	const { isLoading, jobReports } = useJobReport();

	// TODO: mobile columns less? or maybe scroll? idk what would be best UX
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
						cell: (info) => readableKind(info.getValue<string>()),
						footer: (props) => props.column.id,
					},
					{
						accessorKey: 'status',
						header: 'Status',
						// change value to all lowercase except for first letter
						cell: (info) => formatJobStatus(info.getValue<JobStatus>()),
						footer: (props) => props.column.id,
					},
				],
			},
		],
		[],
	);

	return (
		<Table
			columns={columns}
			options={{
				getCoreRowModel: getCoreRowModel(),
				// TODO: change to manual once API endpoint is ready
				getPaginationRowModel: getPaginationRowModel(), // If only doing manual pagination, you don't need this
				debugTable: true,
				debugHeaders: true,
				debugColumns: true,
			}}
			data={jobReports ?? []}
			fullWidth
		/>
	);
}
