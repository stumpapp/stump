import { jobQueryKeys, libraryQueryKeys } from '@stump/api'
import type { CoreEvent } from '@stump/types'

import { invalidateQueries } from '../invalidate'
import { useJobStore } from '../stores/job'
import { useStumpWs } from './useStumpWs'

export function useCoreEventHandler() {
	const { addJob, upsertJob, removeJob } = useJobStore((state) => ({
		addJob: state.addJob,
		removeJob: state.removeJob,
		upsertJob: state.upsertJob,
	}))

	const handleInvalidate = async (keys: string[]) => {
		try {
			await invalidateQueries({ keys })
		} catch (e) {
			console.error('Failed to invalidate queries', e)
		}
	}

	async function handleCoreEvent(event: CoreEvent) {
		const { __typename } = event

		switch (__typename) {
			case 'JobStarted':
				await handleInvalidate([jobQueryKeys.getJobs])
				addJob(event)
				break
			case 'JobUpdate':
				if (!!event.status && event.status !== 'RUNNING') {
					await new Promise((resolve) => setTimeout(resolve, 1000))
					removeJob(event.id)
					await handleInvalidate([jobQueryKeys.getJobs, 'library', 'series', 'media'])
				} else {
					upsertJob(event)
				}
				break
			case 'DiscoveredMissingLibrary':
				await handleInvalidate(['library', 'series', 'media'])
				break
			case 'CreatedManySeries':
				await handleInvalidate(['library', 'series', 'media'])
				break
			case 'CreatedOrUpdatedManyMedia':
				await handleInvalidate([
					'series',
					'media',
					libraryQueryKeys.getLibrariesStats,
					libraryQueryKeys.getLibraryById,
				])
				break
		}
	}

	useStumpWs({ onEvent: handleCoreEvent })
}
