import { useGraphQLSubscription, useJobStore, useSDK } from '@stump/client'
import { graphql, JobStatus, JobUpdate, UseCoreEventSubscription } from '@stump/graphql'
import { Api } from '@stump/sdk'
import { QueryClient, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect } from 'react'
import { toast } from 'sonner'
import { match, P } from 'ts-pattern'

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
					... on LibraryScanOutput {
						createdMedia
						createdSeries
						updatedMedia
						updatedSeries
					}
					... on SeriesScanOutput {
						createdMedia
						updatedMedia
					}
				}
			}
		}
	}
`)

type Params = {
	liveRefetch?: boolean
	onConnectionWithServerChanged?: (connected: boolean) => void
}

// TODO: Attempt reconnect with re-auth
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
		onConnected: () => {
			console.log('Connected to GraphQL subscription')
			onConnectionWithServerChanged?.(true)
		},
		// TODO: Figure this out
		onDisconnected: () => {
			console.log('Disconnected from GraphQL subscription')
			// dispose()
			// setTimeout(() => {
			// 	if (socket?.readyState !== WebSocket.OPEN) {
			// 		onConnectionWithServerChanged?.(false)
			// 	}
			// }, 5_000)
		},
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

const eventHandler = async (
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
				await client.invalidateQueries({ queryKey: [sdk.cacheKeys.jobs], exact: false })
				if (event.status === JobStatus.Completed) {
					toast.success(event.message || 'Job completed')
				}
			} else {
				store.upsertJob(event)
			}
			break
		case 'CreatedManySeries':
			if (liveRefetch) {
				await Promise.all([
					client.invalidateQueries({ queryKey: [sdk.cacheKeys.getStats], exact: false }),
					client.invalidateQueries({
						predicate: ({ queryKey: [rootKey] }) =>
							typeof rootKey === 'string' && ['series', 'media'].includes(rootKey.toLowerCase()),
					}),
				])
			}
			break
		case 'CreatedOrUpdatedManyMedia':
			if (liveRefetch) {
				await client.invalidateQueries({
					predicate: ({ queryKey: [rootKey] }) =>
						typeof rootKey === 'string' && ['series', 'media'].includes(rootKey.toLowerCase()),
				})
			}
			break
		case 'JobOutput':
			handleJobOutput(event, { client, sdk })
			break
		default:
			console.warn(`Unhandled core event type: ${__typename}`)
	}
}

const handleJobOutput = async (
	{ output }: Extract<UseCoreEventSubscription['readEvents'], { __typename: 'JobOutput' }>,
	{ client, sdk }: Omit<EventHandlerParams, 'store' | 'liveRefetch'>,
) => {
	const affectedBooks = match(output)
		.with(
			{ __typename: P.union('LibraryScanOutput', 'SeriesScanOutput') },
			({ createdMedia, updatedMedia }) => createdMedia + updatedMedia,
		)
		.otherwise(() => 0)

	const affectedSeries = match(output)
		.with(
			{ __typename: 'LibraryScanOutput' },
			({ createdSeries, updatedSeries }) => createdSeries + updatedSeries,
		)
		.with({ __typename: 'SeriesScanOutput' }, () => affectedBooks)
		.otherwise(() => 0)

	const keys = [
		sdk.cacheKeys.scanHistory,
		sdk.cacheKeys.getStats,
		...(affectedBooks > 0 ? [sdk.cacheKeys.recentlyAddedMedia, sdk.cacheKeys.media] : []),
		...(affectedSeries > 0 ? [sdk.cacheKeys.recentlyAddedSeries, sdk.cacheKeys.series] : []),
	] as string[]

	await client.invalidateQueries({
		predicate: ({ queryKey: [rootKey] }) => typeof rootKey === 'string' && keys.includes(rootKey),
	})
}
