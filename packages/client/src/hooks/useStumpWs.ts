import type { CoreEvent } from '@stump/sdk'
import { useMemo } from 'react'
import useWebSocket, { ReadyState } from 'react-use-websocket'

import { useSDK } from '../sdk'

interface Props {
	onEvent(event: CoreEvent): void
	onConnectionWithServerChanged?: (connected: boolean) => void
}

export function useStumpWs({ onEvent, onConnectionWithServerChanged }: Props) {
	const { sdk } = useSDK()

	const socketUrl = useMemo(() => {
		let url = sdk.serviceURL
		// remove http(s):// from url, and replace with ws(s)://
		url = url.replace(/^http(s?):\/\//, 'ws$1://')
		// remove /api(/) from end of url
		url = url.replace(/\/api(\/v\d)?$/, '')

		return `${url}/ws`
	}, [sdk])

	function handleWsMessage(e: MessageEvent<unknown>) {
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

	function handleOpen() {
		console.debug('Websocket connected')
		onConnectionWithServerChanged?.(true)
	}

	function handleClose() {
		console.debug('Websocket closed')
		onConnectionWithServerChanged?.(false)
	}

	const { readyState } = useWebSocket(socketUrl, {
		onClose: handleClose,
		onMessage: handleWsMessage,
		onOpen: handleOpen,
	})

	return { readyState }
}

// Re-export the ready state enum so consumer of client can use it if needed
export { ReadyState }
