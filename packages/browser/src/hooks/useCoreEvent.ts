import { useGraphQLSubscription, useJobStore, useSDK } from '@stump/client'
import { graphql, JobUpdate, UseCoreEventSubscription } from '@stump/graphql'
import { Api } from '@stump/sdk'
import { QueryClient, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect } from 'react'

const subscription = graphql(`
	subscription UseCoreEvent {
		readEvents {
			__typename
			... on CreatedManySeries {
				count
				libraryId
			}
			... on CreatedMedia {
				id
				seriesId
			}
			... on CreatedOrUpdatedManyMedia {
				count
				seriesId
			}
			... on DiscoveredMissingLibrary {
				id
			}
			... on JobStarted {
				id
			}
			... on JobUpdate {
				__typename
				id
				status
				message
				completedTasks
				remainingTasks
				completedSubtasks
				totalSubtasks
			}
			... on JobOutput {
				id
				output {
					__typename
					# TODO: Selection
				}
			}
		}
	}
`)

type Params = {
	liveRefetch?: boolean
	onConnectionWithServerChanged?: (connected: boolean) => void
}

export function useCoreEvent({ liveRefetch, onConnectionWithServerChanged }: Params) {
	const store = useJobStore((state) => ({
		addJob: state.addJob,
		removeJob: state.removeJob,
		upsertJob: state.upsertJob,
	}))
	const client = useQueryClient()

	const { sdk } = useSDK()

	const onPayloadReceived = useCallback(
		(payload: UseCoreEventSubscription) =>
			eventHandler(payload.readEvents, { store, client, sdk, liveRefetch }),
		[store, client, sdk, liveRefetch],
	)

	const [socket, dispose] = useGraphQLSubscription(subscription, {
		onMessage: (payload) => onPayloadReceived(payload),
	})

	useEffect(
		() => {
			return () => {
				dispose()
			}
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[],
	)
}

type EventHandlerParams = {
	store: {
		addJob: (id: string) => void
		removeJob: (jobId: string) => void
		upsertJob: (job: JobUpdate) => void
	}
	client: QueryClient
	sdk: Api
	liveRefetch?: boolean
}

const eventHandler = (
	event: UseCoreEventSubscription['readEvents'],
	{ store, client, sdk, liveRefetch }: EventHandlerParams,
) => {
	const { __typename } = event

	switch (__typename) {
		case 'JobStarted':
			store.addJob(event.id)
			client.invalidateQueries({ queryKey: [sdk.cacheKeys.jobs] })
			break
		case 'JobUpdate':
			if (event.status && event.status !== 'RUNNING') {
				store.removeJob(event.id)
				client.invalidateQueries({ queryKey: [sdk.cacheKeys.jobs], exact: false })
			} else {
				store.upsertJob(event)
			}
			break
		case 'CreatedManySeries':
			if (liveRefetch) {
				client.invalidateQueries({ queryKey: [sdk.cacheKeys.getStats, 'series', 'media'] })
			}
			break
		case 'CreatedOrUpdatedManyMedia':
			if (liveRefetch) {
				client.invalidateQueries({ queryKey: ['series', 'media'] })
			}
			break
		default:
			console.warn(`Unhandled core event type: ${__typename}`)
	}
}
