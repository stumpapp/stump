import { useMemo } from 'react';
import useWebSocket, { ReadyState } from 'react-use-websocket';

import { API } from '../api';
import { useStumpStore } from '../stores';
import type { CoreEvent } from '../types';

interface Props {
	onEvent(event: CoreEvent): void;
}

export function useStumpWs({ onEvent }: Props) {
	const { setConnected } = useStumpStore();

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

	function handleOpen() {
		setConnected(true);
	}

	function handleClose() {
		setConnected(false);
	}

	const { readyState } = useWebSocket(socketUrl, {
		onClose: handleClose,
		onMessage: handleWsMessage,
		onOpen: handleOpen,
	});

	return { readyState };
}

// Re-export the ready state enum so consumer of client can use it if needed
export { ReadyState };
