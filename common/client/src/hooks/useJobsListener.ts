import { CoreEvent } from '@stump/core';
import { useEffect, useMemo } from 'react';
import { API } from '../api';

interface Props {
	onEvent(event: CoreEvent): void;
}

export function useJobsListener({ onEvent }: Props) {
	const eventSource = useMemo(
		() => ({
			url: `${API.getUri()}/jobs/listen`,
			config: {
				withCredentials: true,
			},
		}),
		[API?.getUri()],
	);

	useEffect(() => {
		let sse: EventSource;

		function initEventSource() {
			sse = new EventSource(eventSource.url, eventSource.config);

			sse.onmessage = (e) => {
				// console.log('EVENT', e);
				try {
					const event = JSON.parse(e.data);
					onEvent(event);
				} catch (err) {
					console.error(err);
				}
			};

			sse.onerror = (event) => {
				console.error('EventSource error event:', event);

				sse?.close();

				setTimeout(() => {
					initEventSource();
				}, 1000);
			};
		}

		initEventSource();

		return () => {
			sse?.close();
		};
	}, []);
}
