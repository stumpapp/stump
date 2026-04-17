import { useGraphQLMutation, useSDK, useSuspenseGraphQL } from '@stump/client'
import { Alert, AlertDescription, AlertTitle, Button, ConfirmationModal } from '@stump/components'
import { graphql, ScheduledJobsQuery } from '@stump/graphql'
import { useLocaleContext } from '@stump/i18n'
import { Api } from '@stump/sdk'
import { QueryClient, useQueryClient } from '@tanstack/react-query'
import { AlertCircleIcon, Plus } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { CreateOrEditScheduledJobDialog } from './CreateOrEditScheduledJobDialog'
import { ScheduledJobRow } from './ScheduledJobRow'

const query = graphql(`
	query ScheduledJobs {
		libraries(pagination: { none: { unpaginated: true } }) {
			nodes {
				id
				name
				emoji
			}
		}
		scheduledJobs {
			id
			name
			...ScheduledJobRow
		}
	}
`)

export const prefetchScheduler = (client: QueryClient, sdk: Api) => {
	client.prefetchQuery({
		queryKey: sdk.cacheKey('scheduler'),
		queryFn: async () => sdk.execute(query),
	})
}

const deleteMutation = graphql(`
	mutation DeleteScheduledJob($id: Int!) {
		deleteScheduledJob(id: $id)
	}
`)

type ScheduledJobQueryNode = ScheduledJobsQuery['scheduledJobs'][number]

export default function JobScheduler() {
	const { t } = useLocaleContext()
	const { sdk } = useSDK()

	const client = useQueryClient()

	const {
		data: {
			libraries: { nodes: libraries },
			scheduledJobs,
		},
	} = useSuspenseGraphQL(query, sdk.cacheKey('scheduler'))

	const [dialogOpen, setDialogOpen] = useState(false)
	const [editing, setEditing] = useState<ScheduledJobQueryNode | null>(null)
	const [deleting, setDeleting] = useState<ScheduledJobQueryNode | null>(null)

	const openCreate = () => {
		setEditing(null)
		setDialogOpen(true)
	}

	const openEdit = (job: ScheduledJobQueryNode) => {
		setEditing(job)
		setDialogOpen(true)
	}

	const invalidate = () => {
		client.invalidateQueries({ queryKey: sdk.cacheKey('scheduler') })
	}

	const { mutate: doDelete } = useGraphQLMutation(deleteMutation, {
		onError: (error) => {
			console.error(error)
			toast.error(t(getKey('toasts.deleteError')))
		},
		onSuccess: () => {
			toast.success(t(getKey('toasts.deleteSuccess')))
			setDeleting(null)
			invalidate()
		},
	})

	// TODO:(ux): Show alert if not config (and not dismissed) OR show always if unsaved changes
	// that would be a bit more work tho soooo not now
	return (
		<div className="my-2 gap-4 flex flex-col">
			<Alert variant="info" id="scheduler-requires-restart" dismissible>
				<AlertCircleIcon className="h-4 w-4" />
				<AlertTitle>{t(getKey('restartRequiredTitle'))}</AlertTitle>
				<AlertDescription>{t(getKey('restartRequired'))}</AlertDescription>
			</Alert>

			{scheduledJobs.length > 0 && (
				<div className="gap-3 flex flex-col">
					{scheduledJobs.map((job) => (
						<ScheduledJobRow
							key={job.id}
							job={job}
							libraries={libraries}
							onEdit={() => openEdit(job)}
							onDelete={() => setDeleting(job)}
						/>
					))}
				</div>
			)}

			<div>
				<Button variant="secondary" size="sm" onClick={openCreate}>
					<Plus className="mr-1.5 h-4 w-4" />
					{t(getKey('newScheduledJob'))}
				</Button>
			</div>

			<CreateOrEditScheduledJobDialog
				isOpen={dialogOpen}
				editing={editing}
				libraries={libraries}
				onClose={() => setDialogOpen(false)}
				onSuccess={invalidate}
			/>

			<ConfirmationModal
				isOpen={!!deleting}
				title={t(getKey('deleteScheduledJob.title'))}
				description={`${t(getKey('deleteScheduledJob.description')).replace('{{name}}', deleting?.name ?? '')}`}
				confirmText={t(getKey('deleteScheduledJob.confirm'))}
				confirmVariant="danger"
				onConfirm={() => deleting && doDelete({ id: deleting.id })}
				onClose={() => setDeleting(null)}
			/>
		</div>
	)
}

const LOCALE_BASE = 'settingsScene.server/jobs.sections.scheduling'
const getKey = (key: string) => `${LOCALE_BASE}.${key}`
