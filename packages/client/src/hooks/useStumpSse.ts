import { API } from '@stump/api'
import type { CoreEvent } from '@stump/types'
import { useCallback, useEffect, useMemo, useRef } from 'react'

interface SseOptions {
	onOpen?: (event: Event) => void
	onClose?: (event?: Event) => void
	onMessage?: (event: MessageEvent<unknown>) => void
	onError?: (event: Event) => void
}

let sse: EventSource

function useSse(url: string, { onOpen, onClose, onMessage }: SseOptions = {}) {
	const timoutRef = useRef<NodeJS.Timeout | null>(null)
	/**
	 * Initialize the EventSource connection
	 */
	const initEventSource = useCallback(() => {
		sse = new EventSource(url, {
			withCredentials: true,
		})

		sse.onmessage = (e) => {
			// console.log('EVENT', e);
			onMessage?.(e)
		}

		sse.onerror = (event) => {
			console.error('EventSource error event:', event)

			sse?.close()

			timoutRef.current = setTimeout(() => {
				initEventSource()

				if (sse?.readyState !== EventSource.OPEN) {
					onClose?.(event)
					return
				}
			}, 5000)
		}

		sse.onopen = (e) => {
			onOpen?.(e)
		}
	}, [onClose, onMessage, onOpen, url])

	useEffect(
		() => {
			initEventSource()

			return () => {
				sse?.close()
				if (timoutRef.current) {
					clearTimeout(timoutRef.current)
				}
			}
		},

		// eslint-disable-next-line react-hooks/exhaustive-deps
		[url],
	)

	return {
		readyState: sse?.readyState,
	}
}

interface Props {
	onEvent: (event: CoreEvent) => void
	onConnectionWithServerChanged?: (connected: boolean) => void
}

export function useStumpSse({ onEvent, onConnectionWithServerChanged }: Props) {
	const URI = API?.getUri()

	const eventSourceUrl = useMemo(() => {
		let url = URI
		// remove /api(/) from end of url
		url = url.replace(/\/api(\/v\d)?$/, '')

		return `${url}/sse`
	}, [URI])

	const handleMessage = useCallback(
		(e: MessageEvent<unknown>) => {
			if ('data' in e && typeof e.data === 'string') {
				try {
					const event = JSON.parse(e.data)
					onEvent(event)
				} catch (err) {
					console.error(err)
				}
			} else {
				console.warn('Unrecognized message event:', e)
			}
		},
		[onEvent],
	)

	const { readyState } = useSse(eventSourceUrl, {
		onClose: () => {
			onConnectionWithServerChanged?.(false)
		},
		onMessage: handleMessage,
		onOpen: () => {
			onConnectionWithServerChanged?.(true)
		},
	})

	return {
		readyState,
	}
}
