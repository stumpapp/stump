import { CoreEvent, CoreJobOutput, LibraryScanOutput } from '@stump/graphql'
import { Api } from '@stump/sdk'
import { QueryClient, useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'

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

	const client = useQueryClient()

	const handleInvalidate = useCallback(
		async (keys: string[]) => {
			try {
				await client.invalidateQueries({
					predicate: (query) => keys.some((key) => query.queryKey.includes(key)),
				})
			} catch (e) {
				console.error('Failed to invalidate queries', e)
			}
		},
		[client],
	)

	const handleCoreEvent = useCallback(
		async (event: CoreEvent) => {
			const { __typename } = event

			switch (__typename) {
				case 'JobStarted':
					await handleInvalidate([sdk.job.keys.get])
					addJob(event.id)
					break
				case 'JobUpdate':
					if (!!event.payload.status && event.payload.status !== 'RUNNING') {
						await new Promise((resolve) => setTimeout(resolve, 1000))
						removeJob(event.id)
						await handleInvalidate([sdk.job.keys.get])
					} else {
						upsertJob(event)
					}
					break
				case 'JobOutput':
					await handleJobOutput(event.output, sdk, client)
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
		[addJob, handleInvalidate, liveRefetch, removeJob, upsertJob, sdk, client],
	)

	useStumpSse({ onConnectionWithServerChanged, onEvent: handleCoreEvent })
}

const handleJobOutput = async (output: CoreJobOutput, sdk: Api, client: QueryClient) => {
	if (isLibraryScanOutput(output)) {
		const requeryBooks = output.createdMedia.valueOf() + output.updatedMedia.valueOf() > 0
		const requerySeries = output.createdSeries.valueOf() + output.updatedSeries.valueOf() > 0

		const keys = [sdk.library.keys.scanHistory, sdk.library.keys.getStats]

		if (requeryBooks) {
			keys.push(sdk.media.keys.recentlyAdded, sdk.media.keys.get)
		}

		if (requerySeries) {
			keys.push(...[sdk.series.keys.recentlyAdded, sdk.series.keys.get])
		}

		try {
			await client.invalidateQueries({
				predicate: (query) => keys.some((key) => query.queryKey.includes(key)),
			})
		} catch (e) {
			console.error('Failed to invalidate queries', e)
		}
	} else {
		console.warn('Unhandled job output', output)
	}
}

const isLibraryScanOutput = (output: CoreJobOutput): output is LibraryScanOutput => {
	const requiredKeys = ['createdMedia', 'updatedMedia', 'createdSeries', 'updatedSeries']
	return requiredKeys.every((key) => key in output)
}
