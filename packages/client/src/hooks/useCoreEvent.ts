import type { CoreEvent } from '@stump/types'

import { useJobContext } from '../context'
import { core_event_triggers, invalidateQueries } from '../invalidate'
import { useStumpSse } from './useStumpSse'

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
				// FIXME:  Testing with a test library containing over 10k cbz files, there are so
				//  many updates that around 2000k it just dies. I have implemented a check to
				// in this store function where if the task_count is greater than 1000, it will
				// only update the store every 50 tasks. This is a temporary fix. The UI is still pretty
				// slow when this happens, but is usable. A better solution needs to be found.
				// setTimeout(() => updateJob(data), 1000)
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

	useStumpSse({ onEvent: handleCoreEvent })
}
