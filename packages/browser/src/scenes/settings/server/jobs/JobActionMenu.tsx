import { useGraphQLMutation, useSDK } from '@stump/client'
import { Button, DropdownMenu } from '@stump/components'
import { graphql } from '@stump/graphql'
import { useQueryClient } from '@tanstack/react-query'
import { Ban, Database, FileClock, ListX, MoreVertical, Trash2 } from 'lucide-react'
import { useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'

import paths from '@/paths'

import { JobDataInspectorFragment } from './JobDataInspector'
import { PersistedJob } from './JobTable'

const cancelMutation = graphql(`
	mutation JobActionMenuCancelJob($id: ID!) {
		cancelJob(id: $id)
	}
`)

const deleteMutation = graphql(`
	mutation JobActionMenuDeleteJob($id: ID!) {
		cancelJob(id: $id)
	}
`)

const deleteLogsMutation = graphql(`
	mutation JobActionMenuDeleteLogs($id: ID!) {
		deleteJobLogs(id: $id) {
			affectedRows
		}
	}
`)

type Props = {
	job: PersistedJob
	onInspectData: (data: JobDataInspectorFragment | null) => void
}

export default function JobActionMenu({ job, onInspectData }: Props) {
	const navigate = useNavigate()
	const client = useQueryClient()

	const { sdk } = useSDK()

	const isCancelable =
		job.status === 'RUNNING' || job.status === 'QUEUED' || job.status === 'PAUSED'
	const isDeletable =
		job.status === 'COMPLETED' || job.status === 'FAILED' || job.status === 'CANCELLED'

	const options = useMemo(
		() => ({
			onSuccess: () =>
				client.refetchQueries({
					predicate: ({ queryKey }) => queryKey.includes(sdk.cacheKeys.jobs),
				}),
			onError: (error: unknown) => {
				if (isBadStateError(error)) {
					toast.warning('This job was found in an invalid state', {
						description: 'Please check server logs and report this issue',
					})
					client.refetchQueries({
						predicate: ({ queryKey }) => queryKey.includes(sdk.cacheKeys.jobs),
					})
				} else if (error instanceof Error) {
					toast.error(error.message)
				} else {
					console.error(error)
					toast.error('An unknown error occurred')
				}
			},
		}),
		[sdk, client],
	)

	const { mutate: cancelJob } = useGraphQLMutation(cancelMutation, options)
	const { mutate: deleteJob } = useGraphQLMutation(deleteMutation, options)
	const { mutate: deleteJobLogs } = useGraphQLMutation(deleteLogsMutation, options)

	const actions = useMemo(
		() => ({
			cancel: cancelJob,
			delete: deleteJob,
			deleteLogs: deleteJobLogs,
		}),
		[cancelJob, deleteJob, deleteJobLogs],
	)
	const handleAction = useCallback(
		(action: keyof typeof actions) => {
			const callback = actions[action]
			if (!callback) {
				throw new Error(`Action "${action}" is not defined`)
			}

			if (action === 'cancel' && !isCancelable) {
				throw new Error('Job cannot be canceled at this time')
			} else if (action === 'delete' && !isDeletable) {
				throw new Error('Job cannot be deleted at this time')
			}

			callback({ id: job.id })
		},
		[actions, isDeletable, isCancelable, job.id],
	)

	const jobId = job.id
	const jobData = job.outputData
	const hasLogs = job.logCount > 0

	const items = useMemo(
		() => [
			...(isCancelable
				? [
						{
							label: 'Cancel',
							leftIcon: <Ban className="mr-2 h-4 w-4" />,
							onClick: () => handleAction('cancel'),
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
			...(hasLogs
				? [
						{
							label: 'View logs',
							leftIcon: <FileClock className="mr-2 h-4 w-4" />,
							onClick: () => navigate(paths.serverLogs(jobId)),
						},
						{
							label: 'Clear logs',
							leftIcon: <ListX className="mr-2 h-4 w-4" />,
							onClick: () => handleAction('deleteLogs'),
						},
					]
				: []),

			...(isDeletable
				? [
						{
							label: 'Delete',
							leftIcon: <Trash2 className="mr-2 h-4 w-4" />,
							onClick: () => handleAction('delete'),
						},
					]
				: []),
		],
		[isCancelable, isDeletable, hasLogs, jobId, jobData, navigate, onInspectData, handleAction],
	)

	return (
		<DropdownMenu
			groups={[
				{
					items,
				},
			]}
			trigger={
				<Button size="icon" variant="ghost" className="shrink-0">
					<MoreVertical className="h-4 w-4" />
				</Button>
			}
			align="end"
		/>
	)
}

const isBadStateError = (error: unknown) =>
	error instanceof Error &&
	error.message.includes('A job was found which was in a deeply invalid state')
