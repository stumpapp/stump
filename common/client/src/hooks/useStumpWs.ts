import type { CoreEvent } from '../types';
import { useMemo } from 'react';
import useWebSocket, { ReadyState } from 'react-use-websocket';
import { API } from '../api';

interface Props {
	onEvent(event: CoreEvent): void;
}

export function useStumpWs({ onEvent }: Props) {
	const socketUrl = useMemo(() => {
		let url = API.getUri();
		// remove http(s):// from url, and replace with ws(s)://
		url = url.replace(/^http(s?):\/\//, 'ws$1://');
		// remove /api(/) from end of url
		url = url.replace(/\/api\/?$/, '');

		return `${url}/ws`;
	}, [API?.getUri()]);

	function handleWsMessage(event: MessageEvent<any>) {
		try {
			const data = JSON.parse(event.data);
			onEvent(data);
		} catch (err) {
			console.error(err);
		}
	}

	// TODO: don't just return this value, create something in the store to track connection status
	// so the UI can display when the connection is lost/reconnecting/etc
	const { readyState } = useWebSocket(socketUrl, { onMessage: handleWsMessage });

	if (readyState !== ReadyState.OPEN) {
		console.log('Websocket status:', readyState);
	}

	return { readyState };
}

// Re-export the ready state enum so consumer of client can use it if needed
export { ReadyState };
