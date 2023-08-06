import { jobApi, jobQueryKeys } from '@stump/api'
import { invalidateQueries } from '@stump/client'
import { DropdownMenu, IconButton } from '@stump/components'
import { JobDetail } from '@stump/types'
import { Ban, MoreVertical } from 'lucide-react'
import React from 'react'
import { toast } from 'react-hot-toast'

type Props = {
	job: JobDetail
}
export default function JobActionMenu({ job }: Props) {
	const handleCancel = async () => {
		if (job.status !== 'RUNNING' && job.status !== 'QUEUED') {
			// This shouldn't happen, but just in case we will refresh the jobs
			// and just return.
			await invalidateQueries({ queryKey: [jobQueryKeys.getJobs] })
			return
		}

		try {
			await jobApi.cancelJob(job.id)
		} catch (error) {
			if (error instanceof Error) {
				toast.error(error.message)
			} else {
				console.error(error)
				toast.error('An unknown error occurred')
			}
		} finally {
			await invalidateQueries({ queryKey: [jobQueryKeys.getJobs] })
		}
	}

	return (
		<DropdownMenu
			groups={[
				{
					items: [
						{
							label: 'Cancel',
							leftIcon: <Ban className="mr-2 h-4 w-4" />,
							onClick: handleCancel,
						},
					],
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
