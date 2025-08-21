import { TypedDocumentString } from '@stump/graphql'

import { Api } from './api'
import { GraphQLError, GraphQLResponse } from './types/graphql'

export const DEFAULT_SOCKET_TIMEOUT = 10000

export type GraphQLWebsocketConnectEventHandlers<TResult> = {
	onOpen: (ev: Event) => void
	onMessage: (data: TResult) => void
	onError: (error: GraphQLError[] | Error) => void
	onClose: (ev: CloseEvent) => void
}

export type GraphQLWebsocketConnectParams<TResult, TVariables> = {
	query: TypedDocumentString<TResult, TVariables>
	variables?: TVariables extends Record<string, never> ? never : TVariables
	sdk: Api
} & Partial<GraphQLWebsocketConnectEventHandlers<TResult>>

export type GraphQLWebsocketConnectReturn = {
	unsubscribe: () => void
	socket: WebSocket
}

/**
 * Attempts to connect to the GraphQL WebSocket endpoint and subscribe to the given query after
 * an HTTP instance received a 101 switching protocol response.
 */
export const attemptWebsocketConnect = async <TResult, TVariables>({
	query,
	variables,
	sdk,
	...events
}: GraphQLWebsocketConnectParams<TResult, TVariables>): Promise<GraphQLWebsocketConnectReturn> => {
	const wsUrl = new URL('/api/graphql/ws', sdk.rootURL.replace(/^http/, 'ws')).toString()

	const socket = new WebSocket(wsUrl, 'graphql-ws')
	const socketID = Math.random().toString(36).substring(2, 15)

	await new Promise<void>((resolve, reject) => {
		const timeout = setTimeout(() => {
			reject(new Error('WebSocket connection timeout'))
		}, sdk.config.socketTimeout)

		const errorHandler = () => {
			clearTimeout(timeout)
			socket.removeEventListener('open', openHandler)
			reject(new Error('Failed to establish WebSocket connection'))
		}

		const openHandler = (ev: Event) => {
			clearTimeout(timeout)
			socket.removeEventListener('error', errorHandler)
			events.onOpen?.(ev)
			resolve()
		}

		const closeHandler = (ev: CloseEvent) => {
			clearTimeout(timeout)
			socket.removeEventListener('error', errorHandler)
			events.onClose?.(ev)
		}

		socket.addEventListener('open', openHandler)
		socket.addEventListener('error', errorHandler)
		socket.addEventListener('close', closeHandler)
	})

	socket.addEventListener('message', (event) => {
		try {
			const message = JSON.parse(event.data)

			// See https://github.com/enisdenjo/graphql-ws/blob/master/PROTOCOL.md
			switch (message.type) {
				case 'connection_ack': {
					socket.send(
						JSON.stringify({
							id: socketID,
							type: 'start',
							payload: {
								query: query.toString(),
								variables: variables || {},
							},
						}),
					)
					break
				}

				case 'data': {
					// TODO: type safety
					const data = message.payload as GraphQLResponse<TResult>

					if (data.errors) {
						events.onError?.(data.errors)
					} else {
						events.onMessage?.(data.data)
					}

					break
				}

				case 'error': {
					console.error('GraphQL subscription error:', message.payload)
					events.onError?.(new Error(message.payload))
					break
				}

				case 'complete': {
					socket.close()
					break
				}
			}
		} catch (error) {
			events.onError?.(error as GraphQLError[] | Error)
		}
	})

	socket.addEventListener('error', (event) => {
		const error = event as unknown as ErrorEvent
		events.onError?.(new Error(error.message))
	})

	// TODO: cookies?? We upgrade the connection so not sure if this is needed
	socket.send(
		JSON.stringify({
			type: 'connection_init',
			payload: {
				headers: {
					...sdk.headers,
				},
			},
		}),
	)

	return {
		socket,
		unsubscribe: () => {
			if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
				if (socket.readyState === WebSocket.OPEN) {
					socket.send(
						JSON.stringify({
							id: socketID,
							type: 'stop',
						}),
					)
				}

				socket.close()
			}
		},
	}
}
