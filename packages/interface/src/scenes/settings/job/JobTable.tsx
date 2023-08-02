import { Badge, Text } from '@stump/components'
import { JobDetail, JobStatus } from '@stump/types'
import { ColumnDef, getCoreRowModel } from '@tanstack/react-table'
import React, { useMemo } from 'react'

import { Table } from '../../../components/table'
import { useJobSettingsContext } from './context'

const DEBUG = import.meta.env.DEV

export default function JobTable() {
	const { jobs, pagination, setPagination, pageCount } = useJobSettingsContext()

	const columns = useMemo<ColumnDef<JobDetail>[]>(
		() => [
			{
				accessorKey: 'name',
				cell: (info) => info.getValue(),
				header: 'Type',
				id: 'type',
			},
			{
				accessorKey: 'description',
				cell: (info) => (
					<Text size="sm" variant="muted">
						{info.getValue<string>()}
					</Text>
				),
				header: 'Description',
				id: 'description',
			},
			{
				accessorFn: (job) => `${job.completed_task_count}/${job.task_count}`,
				cell: ({ row }) => (
					<Text size="sm" variant="muted">
						{row.original.completed_task_count}/{row.original.task_count}
					</Text>
				),
				header: 'Tasks',
				id: 'tasks',
			},
			{
				accessorKey: 'status',
				cell: ({ row }) => {
					const getBadgeVariant = (status: JobStatus) => {
						if (status === 'COMPLETED') {
							return 'success'
						} else if (status === 'CANCELLED') {
							return 'warning'
						} else if (status === 'FAILED') {
							return 'error'
						} else {
							return 'primary'
						}
					}
					return (
						<Badge variant={getBadgeVariant(row.original.status)} size="xs">
							{row.original.status.charAt(0).toUpperCase() +
								row.original.status.slice(1).toLowerCase()}
						</Badge>
					)
				},
				header: 'Status',
				id: 'status',
			},
		],
		[],
	)

	return (
		<Table
			sortable
			columns={columns}
			options={{
				debugColumns: DEBUG,
				debugHeaders: DEBUG,
				debugTable: DEBUG,
				enableSorting: false,
				getCoreRowModel: getCoreRowModel(),
				manualPagination: true,
				onPaginationChange: setPagination,
				pageCount,
				state: {
					pagination,
				},
			}}
			data={jobs}
			fullWidth
		/>
	)
}
