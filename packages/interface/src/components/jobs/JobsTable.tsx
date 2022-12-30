import { JobReport, JobStatus, useJobReport } from '@stump/client'
import { ColumnDef, getCoreRowModel, getPaginationRowModel } from '@tanstack/react-table'
import dayjs from 'dayjs'
import { useMemo } from 'react'

import Table from '../../ui/table/Table'
import { formatJobStatus, readableKind } from './utils'

const IS_DEV = import.meta.env.DEV

// FIXME: loading state
export default function JobsTable() {
	const { isLoading, jobReports } = useJobReport()

	// TODO: mobile columns less? or maybe scroll? idk what would be best UX
	const columns = useMemo<ColumnDef<JobReport>[]>(
		() => [
			{
				columns: [
					{
						accessorKey: 'id',
						cell: (info) => info.getValue(),
						footer: (props) => props.column.id,
						header: 'Job ID',
					},
					{
						accessorKey: 'kind',
						cell: (info) => readableKind(info.getValue<string>()),
						footer: (props) => props.column.id,
						header: 'Type',
					},
					{
						accessorKey: 'status',
						// change value to all lowercase except for first letter
						cell: (info) => formatJobStatus(info.getValue<JobStatus>()),

						footer: (props) => props.column.id,
						header: 'Status',
					},
					// FIXME: I think sorting of this is backwards, because it is string sorting
					// and this particular column needs to be sorted differently.... AGH
					{
						accessorKey: 'completed_at',
						cell: (info) => {
							const completed_at = info.getValue<string | null>()
							if (completed_at) {
								return dayjs(completed_at).format('YYYY-MM-DD HH:mm:ss')
							}
						},
						footer: (props) => props.column.id,
						header: 'Time Completed',
					},
				],
				id: 'jobHistory',
			},
		],
		[],
	)

	return (
		<Table
			sortable
			searchable
			columns={columns}
			options={{
				debugColumns: IS_DEV,

				debugHeaders: IS_DEV,

				// If only doing manual pagination, you don't need this
				debugTable: IS_DEV,

				getCoreRowModel: getCoreRowModel(),
				// TODO: change to manual once API endpoint is ready
				getPaginationRowModel: getPaginationRowModel(),
			}}
			data={jobReports ?? []}
			fullWidth
		/>
	)
}
