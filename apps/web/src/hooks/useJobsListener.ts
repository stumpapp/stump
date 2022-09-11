import { ClientEvent } from '@stump/core';
import { useEffect } from 'react';
import { baseURL } from '~api/index';

interface Props {
	onEvent(event: ClientEvent): void;
}

const eventSource = {
	url: `${baseURL}/jobs/listen`,
	config: {
		withCredentials: true,
	},
};

export function useJobsListener({ onEvent }: Props) {
	useEffect(() => {
		let sse: EventSource;

		function initEventSource() {
			// console.log('initEventSource');
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
