import { jobApi, jobQueryKeys } from '@stump/api'
import { invalidateQueries } from '@stump/client'
import { DropdownMenu, IconButton } from '@stump/components'
import { CoreJobOutput, PersistedJob } from '@stump/types'
import { Ban, Database, FileClock, MoreVertical, Trash2 } from 'lucide-react'
import React, { useCallback, useMemo } from 'react'
import { toast } from 'react-hot-toast'
import { useNavigate } from 'react-router'

import paths from '@/paths'

type Props = {
	job: PersistedJob
	onInspectData: (data: CoreJobOutput | null) => void
}
export default function JobActionMenu({ job, onInspectData }: Props) {
	const navigate = useNavigate()

	const isCancelable =
		job.status === 'RUNNING' || job.status === 'QUEUED' || job.status === 'PAUSED'
	const isDeletable =
		job.status === 'COMPLETED' || job.status === 'FAILED' || job.status === 'CANCELLED'

	/**
	 * A generic error handler for the other utility functions in this component.
	 */
	const handleError = (error: unknown) => {
		if (error instanceof Error) {
			toast.error(error.message)
		} else {
			console.error(error)
			toast.error('An unknown error occurred')
		}
	}

	/**
	 * Cancels the running job.
	 */
	const handleCancel = useCallback(async () => {
		if (!isCancelable) {
			// This shouldn't happen, but just in case we will refresh the jobs
			// and just return.
			await invalidateQueries({ queryKey: [jobQueryKeys.getJobs] })
			return
		}

		try {
			await jobApi.cancelJob(job.id)
		} catch (error) {
			handleError(error)
		} finally {
			await invalidateQueries({ queryKey: [jobQueryKeys.getJobs] })
		}
	}, [job.id, isCancelable])

	/**
	 * Deletes the record of the job from the database.
	 */
	const handleDelete = useCallback(async () => {
		// We don't allow DELETE for in-flight/queued jobs
		if (!isDeletable) {
			return
		}

		try {
			await jobApi.deleteJob(job.id)
		} catch (error) {
			handleError(error)
		} finally {
			await invalidateQueries({ queryKey: [jobQueryKeys.getJobs] })
		}
	}, [job.id, isDeletable])

	const jobId = job.id
	const jobData = job.output_data
	const associatedLogs = useMemo(() => job.logs ?? [], [job.logs])
	const items = useMemo(
		() => [
			...(isCancelable
				? [
						{
							label: 'Cancel',
							leftIcon: <Ban className="mr-2 h-4 w-4" />,
							onClick: handleCancel,
						},
					]
				: []),
			...(jobData
				? [
						{
							label: 'View data',
							leftIcon: <Database className="mr-2 h-4 w-4" />,
							onClick: () => onInspectData(jobData),
						},
					]
				: []),
			...(associatedLogs.length > 0
				? [
						{
							label: 'View logs',
							leftIcon: <FileClock className="mr-2 h-4 w-4" />,
							onClick: () => navigate(paths.serverLogs(jobId)),
						},
					]
				: []),

			...(isDeletable
				? [
						{
							label: 'Delete',
							leftIcon: <Trash2 className="mr-2 h-4 w-4" />,
							onClick: handleDelete,
						},
					]
				: []),
		],
		[
			isCancelable,
			isDeletable,
			associatedLogs,
			jobId,
			jobData,
			navigate,
			onInspectData,
			handleCancel,
			handleDelete,
		],
	)

	return (
		<DropdownMenu
			groups={[
				{
					items,
				},
			]}
			trigger={
				<IconButton size="xs" variant="ghost">
					<MoreVertical className="h-4 w-4" />
				</IconButton>
			}
			align="end"
		/>
	)
}
