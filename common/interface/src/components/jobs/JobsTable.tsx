import { ColumnDef, getCoreRowModel, getPaginationRowModel } from '@tanstack/react-table';
import { useMemo } from 'react';
import { JobReport, JobStatus, useJobReport } from '@stump/client';
import { formatJobStatus, readableKind } from './utils';
import Table from '../../ui/table/Table';

const IS_DEV = import.meta.env.DEV;

// FIXME: loading state
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
			sortable
			searchable
			columns={columns}
			options={{
				getCoreRowModel: getCoreRowModel(),
				// TODO: change to manual once API endpoint is ready
				getPaginationRowModel: getPaginationRowModel(), // If only doing manual pagination, you don't need this
				debugTable: IS_DEV,
				debugHeaders: IS_DEV,
				debugColumns: IS_DEV,
			}}
			data={jobReports ?? []}
			fullWidth
		/>
	);
}
