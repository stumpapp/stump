import type { CoreEvent, JobUpdate } from '@stump/types'

import { useJobContext } from '../context'
import { core_event_triggers, invalidateQueries } from '../invalidate'
import { useStumpWs } from './useStumpWs'

interface UseCoreEventHandlerParams {
	onJobComplete?: (jobId: string) => void
	onJobFailed?: (err: { job_id: string; message: string }) => void
}

// TODO: I hate this pattern here and it would be a lovely time to refactor it!!!

export function useCoreEventHandler({
	onJobComplete,
	onJobFailed,
}: UseCoreEventHandlerParams = {}) {
	const { updateJob, removeJob } = useJobContext()

	async function handleCoreEvent(event: CoreEvent) {
		const { __typename } = event

		switch (__typename) {
			case 'JobUpdate':
				if (event.status !== 'RUNNING') {
					// onJobComplete?.(event.id)
					removeJob(event.id)
				} else {
					updateJob(event)
				}
				break
		}

		// switch (__typename) {
		// 	case 'JobStarted':
		// 		addJob(data)
		// 		break
		// 	case 'JobProgress':
		// 		updateJob(data)
		// 		break
		// 	case 'JobComplete':
		// 		removeJob(data)
		// 		await new Promise((resolve) => setTimeout(resolve, 300))
		// 		await invalidateQueries({ keys: core_event_triggers[key].keys })
		// 		onJobComplete?.(data)
		// 		break
		// 	case 'JobFailed':
		// 		onJobFailed?.(data)
		// 		removeJob(data.job_id)
		// 		await invalidateQueries({ keys: core_event_triggers[key].keys })
		// 		break
		// 	default:
		// 		// eslint-disable-next-line no-case-declarations
		// 		const result = core_event_triggers[key]
		// 		if (result?.keys) {
		// 			await new Promise((resolve) => setTimeout(resolve, 300))
		// 			await invalidateQueries({ exact: false, keys: result.keys })
		// 		} else {
		// 			console.warn(`Unhandled core event: ${key}`, event)
		// 		}
		// 		break
		// }
	}

	// useStumpSse({ onEvent: handleCoreEvent })
	useStumpWs({ onEvent: handleCoreEvent })
}
