import { useEffect } from 'react';
import { baseURL } from '~api/index';

interface Props {
	onEvent(event: JobEvent): void;
}

export function useJobsListener({ onEvent }: Props) {
	useEffect(() => {
		let sse = new EventSource(`${baseURL}/jobs/listen`, {
			withCredentials: true,
		});

		sse.onmessage = (e) => {
			try {
				const event = JSON.parse(e.data);
				onEvent(event);
			} catch (err) {
				console.error(err);
			}
		};

		sse.onerror = (event) => {
			// console.log('ONERR', event);
		};

		return () => {
			sse?.close();
		};
	}, []);
}
