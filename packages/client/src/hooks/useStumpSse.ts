import { useEffect, useMemo } from 'react'

import { API } from '../api'
import { useStumpStore } from '../stores'
import type { CoreEvent } from '../types'

interface SseOptions {
	onOpen?: (event: Event) => void
	onClose?: (event?: Event) => void
	onMessage?: (event: MessageEvent<unknown>) => void
	onError?: (event: Event) => void
}

let sse: EventSource

// this is a little meh
function useSse(url: string, sseOptions: SseOptions = {}) {
	const { onOpen, onClose, onMessage } = sseOptions

	function initEventSource() {
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

			setTimeout(() => {
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
	}

	useEffect(
		() => {
			initEventSource()

			return () => {
				sse?.close()
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
	onEvent(event: CoreEvent): void
}

export function useStumpSse({ onEvent }: Props) {
	const URI = API?.getUri()
	const { setConnected } = useStumpStore()

	const eventSourceUrl = useMemo(() => {
		let url = URI
		// remove /api(/) from end of url
		url = url.replace(/\/api\/?$/, '')

		return `${url}/sse`
	}, [URI])

	function handleMessage(e: MessageEvent<unknown>) {
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
	}

	const { readyState } = useSse(eventSourceUrl, {
		onClose: () => {
			setConnected(false)
		},
		onMessage: handleMessage,
		onOpen: () => {
			setConnected(true)
		},
	})

	return {
		readyState,
	}
}
