import type { CoreEvent } from '@stump/types'

import { useJobContext } from '../context'
import { core_event_triggers, invalidateQueries } from '../invalidate'
import { useStumpWs } from '.'

interface UseCoreEventHandlerParams {
	onJobComplete?: (jobId: string) => void
	onJobFailed?: (err: { job_id: string; message: string }) => void
}

export function useCoreEventHandler({
	onJobComplete,
	onJobFailed,
}: UseCoreEventHandlerParams = {}) {
	const context = useJobContext()

	if (!context) {
		throw new Error('useCoreEventHandler must be used within a JobContext')
	}

	const { addJob, updateJob, removeJob } = context

	async function handleCoreEvent(event: CoreEvent) {
		const { key, data } = event

		switch (key) {
			case 'JobStarted':
				addJob(data)
				break
			case 'JobProgress':
				updateJob(data)
				break
			case 'JobComplete':
				removeJob(data)
				await invalidateQueries({ keys: core_event_triggers[key].keys })
				onJobComplete?.(data)
				break
			case 'JobFailed':
				onJobFailed?.(data)
				removeJob(data.job_id)
				invalidateQueries({ keys: core_event_triggers[key].keys })

				break
			case 'CreatedMedia':
			case 'CreatedMediaBatch':
			case 'CreatedSeries':
			case 'CreatedSeriesBatch':
			case 'GeneratedThumbnailBatch':
				// I set a timeout here to give the backend a little time to analyze at least
				// one of the books in a new series before triggering a refetch. This is to
				// prevent the series/media cards from being displayed before there is an image ready.
				setTimeout(() => {
					invalidateQueries({ keys: core_event_triggers[key].keys })
				}, 250)
				break
			default:
				console.warn('Unknown JobEvent', data)
				console.debug(data)
				break
		}
	}

	// useStumpSse({ onEvent: handleCoreEvent })
	useStumpWs({ onEvent: handleCoreEvent })
}
