import type { CoreEvent } from '../types';
import { useEffect, useMemo } from 'react';

import { API } from '../api';
import { useStumpStore } from '../stores';

interface SseOptions {
	onOpen?: (event: Event) => void;
	onClose?: (event?: Event) => void;
	onMessage?: (event: MessageEvent<any>) => void;
	onError?: (event: Event) => void;
}

let sse: EventSource;

function useSse(url: string, sseOptions: SseOptions = {}) {
	const { onOpen, onClose, onMessage } = sseOptions;

	function initEventSource() {
		sse = new EventSource(url, {
			withCredentials: true,
		});

		sse.onmessage = (e) => {
			// console.log('EVENT', e);
			onMessage?.(e);
		};

		sse.onerror = (event) => {
			console.error('EventSource error event:', event);

			// @ts-ignore: this exists
			if (event?.target?.readyState === EventSource.CLOSED) {
				console.error('EventSource closed');
				onClose?.(event);
			}

			sse?.close();

			setTimeout(() => {
				initEventSource();
			}, 1000);
		};

		sse.onopen = (e) => {
			onOpen?.(e);
		};
	}

	useEffect(() => {
		initEventSource();

		return () => {
			sse?.close();
		};
	}, [url]);

	useEffect(() => {
		if (sse?.readyState === EventSource.CLOSED) {
			setTimeout(() => {
				if (sse?.readyState === EventSource.CLOSED) {
					onClose?.();
				}
			}, 1000);
		}
	}, [sse?.readyState]);

	return {
		readyState: sse?.readyState,
	};
}

interface Props {
	onEvent(event: CoreEvent): void;
}

export function useStumpSse({ onEvent }: Props) {
	const { setConnected } = useStumpStore();

	const eventSourceUrl = useMemo(() => {
		let url = API.getUri();
		// remove /api(/) from end of url
		url = url.replace(/\/api\/?$/, '');

		return `${url}/sse`;
	}, [API?.getUri()]);

	function handleMessage(e: MessageEvent<any>) {
		try {
			const event = JSON.parse(e.data);
			onEvent(event);
		} catch (err) {
			console.error(err);
		}
	}

	const { readyState } = useSse(eventSourceUrl, {
		onMessage: handleMessage,
		onOpen: () => {
			setConnected(true);
		},
		onClose: () => {
			setConnected(false);
		},
		// onError: (e) => {
		// 	// check if the error is a network error
		// 	if (readyState === EventSource.CLOSED) {
		// 		setConnected(false);
		// 	}
		// },
	});

	return {
		readyState,
	};
}
