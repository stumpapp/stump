import { Api } from '@stump/sdk'
import type { CoreEvent, CoreJobOutput, LibraryScanOutput } from '@stump/sdk'
import { useCallback } from 'react'

import { invalidateQueries } from '../invalidate'
import { useSDK } from '../sdk'
import { useJobStore } from '../stores/job'
import { useStumpSse } from './useStumpSse'

// TODO: Test how the updates affect the client without requerying data
// TODO: If above works well, test how the client/scanner bench changes if sending the data
// e.g. if we created 300 books, send them... I imagine this will bog things down a little...

type Params = {
	liveRefetch?: boolean
	onConnectionWithServerChanged?: (connected: boolean) => void
}

export function useCoreEventHandler({ liveRefetch, onConnectionWithServerChanged }: Params = {}) {
	const { sdk } = useSDK()
	const { addJob, upsertJob, removeJob } = useJobStore((state) => ({
		addJob: state.addJob,
		removeJob: state.removeJob,
		upsertJob: state.upsertJob,
	}))

	const handleInvalidate = useCallback(async (keys: string[]) => {
		try {
			await invalidateQueries({ keys })
		} catch (e) {
			console.error('Failed to invalidate queries', e)
		}
	}, [])

	const handleCoreEvent = useCallback(
		async (event: CoreEvent) => {
			const { __typename } = event

			switch (__typename) {
				case 'JobStarted':
					await handleInvalidate([sdk.job.keys.get])
					addJob(event)
					break
				case 'JobUpdate':
					if (!!event.status && event.status !== 'RUNNING') {
						await new Promise((resolve) => setTimeout(resolve, 1000))
						removeJob(event.id)
						await handleInvalidate([sdk.job.keys.get])
					} else {
						upsertJob(event)
					}
					break
				case 'JobOutput':
					await handleJobOutput(event.output, sdk)
					break
				case 'DiscoveredMissingLibrary':
					await handleInvalidate(['library', 'series', 'media'])
					break
				case 'CreatedManySeries':
					if (liveRefetch) {
						await handleInvalidate([sdk.library.keys.getStats, 'series', 'media'])
					}
					break
				case 'CreatedOrUpdatedManyMedia':
					if (liveRefetch) {
						await handleInvalidate([
							'series',
							'media',
							sdk.library.keys.getStats,
							sdk.library.keys.getByID,
						])
					}
					break
				case 'CreatedMedia':
					// We don't really care, should honestly remove this...
					break
				default:
					console.warn('Unhandled core event', event)
			}
		},
		[addJob, handleInvalidate, liveRefetch, removeJob, upsertJob, sdk],
	)

	useStumpSse({ onConnectionWithServerChanged, onEvent: handleCoreEvent })
}

// const patchRecentlyAddedBooks = (books: Media[]) => {
// 	const cache = queryClient.getQueryData<Media[]>([sdk.media.keys.recentlyAdded])
// 	// Add the new books to the front of the list
// 	queryClient.setQueryData([sdk.media.keys.recentlyAdded], [...books, ...(cache ?? [])])
// }

const handleJobOutput = async (output: CoreJobOutput, sdk: Api) => {
	if (isLibraryScanOutput(output)) {
		const requeryBooks = output.created_media.valueOf() + output.updated_media.valueOf() > 0
		const requerySeries = output.created_series.valueOf() + output.updated_series.valueOf() > 0

		const keys = []

		if (requeryBooks) {
			keys.push(sdk.media.keys.recentlyAdded, sdk.media.keys.get)
		}

		if (requerySeries) {
			keys.push(...[sdk.series.keys.recentlyAdded, sdk.series.keys.get])
		}

		if (keys.length > 0) {
			keys.push(...[sdk.library.keys.getStats])
			try {
				await invalidateQueries({ keys })
			} catch (e) {
				console.error('Failed to invalidate queries', e)
			}
		} else {
			console.debug('No keys to invalidate')
		}
	} else {
		console.warn('Unhandled job output', output)
	}
}

const isLibraryScanOutput = (output: CoreJobOutput): output is LibraryScanOutput => {
	const requiredKeys = ['created_media', 'updated_media', 'created_series', 'updated_series']
	return requiredKeys.every((key) => key in output)
}
