import { jobApi, jobQueryKeys } from '@stump/api'
import { invalidateQueries } from '@stump/client'
import { DropdownMenu, IconButton } from '@stump/components'
import { JobDetail } from '@stump/types'
import { Ban, MoreVertical, Trash2 } from 'lucide-react'
import React, { useCallback, useMemo } from 'react'
import { toast } from 'react-hot-toast'

type Props = {
	job: JobDetail
}
export default function JobActionMenu({ job }: Props) {
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
		if (job.status !== 'RUNNING' && job.status !== 'QUEUED') {
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
	}, [job.id, job.status])

	/**
	 * Deletes the record of the job from the database.
	 */
	const handleDelete = useCallback(async () => {
		// We don't allow deletion for in-flight/queued jobs
		if (job.status === 'RUNNING' || job.status === 'QUEUED') {
			return
		}

		try {
			await jobApi.deleteJob(job.id)
		} catch (error) {
			handleError(error)
		} finally {
			await invalidateQueries({ queryKey: [jobQueryKeys.getJobs] })
		}
	}, [job.id, job.status])

	const items = useMemo(
		() => [
			...(job.status === 'RUNNING'
				? [
						{
							label: 'Cancel',
							leftIcon: <Ban className="mr-2 h-4 w-4" />,
							onClick: handleCancel,
						},
				  ]
				: []),
			...(job.status !== 'RUNNING' && job.status !== 'QUEUED'
				? [
						{
							label: 'Delete',
							leftIcon: <Trash2 className="mr-2 h-4 w-4" />,
							onClick: handleDelete,
						},
				  ]
				: []),
		],
		[job.status, handleCancel, handleDelete],
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
