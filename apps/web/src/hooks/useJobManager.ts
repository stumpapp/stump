import { CoreEvent } from '@stump/core';
import toast from 'react-hot-toast';
import client from '~api/client';
import { useStore } from '~stores/mainStore';
import { useJobsListener } from './useJobsListener';

export function useJobManager() {
	const { addJob, updateJob, completeJob } = useStore(({ addJob, updateJob, completeJob }) => ({
		addJob,
		updateJob,
		completeJob,
	}));

	function handleJobEvent(event: CoreEvent) {
		const { key, data } = event;

		if (['JobComplete', 'JobFailed'].includes(key)) {
			client.invalidateQueries(['getJobReports']);
		}

		switch (key) {
			case 'JobStarted':
				addJob(data);
				break;
			case 'JobProgress':
				updateJob(data);
				break;
			case 'JobComplete':
				setTimeout(() => {
					completeJob(data);

					client.invalidateQueries(['getLibrary']);
					client.invalidateQueries(['getLibrariesStats']);
					client.invalidateQueries(['getSeries']);
					toast.success(`Job ${data} complete.`);
				}, 500);
				break;
			case 'JobFailed':
				toast.error(`Job ${data.runner_id} failed.`);
				break;
			case 'CreatedMedia':
			case 'CreatedMediaBatch':
			case 'CreatedSeries':
				// I set a timeout here to give the backend a little time to analyze at least
				// one of the books in a new series before triggering a refetch. This is to
				// prevent the series/media cards from being displayed before there is an image ready.
				setTimeout(() => {
					// TODO: I must misunderstand how this function works. Giving multiple keys
					// does not work, not a huge deal but would rather a one-liner for these.
					client.invalidateQueries(['getLibrary']);
					client.invalidateQueries(['getLibrariesStats']);
					client.invalidateQueries(['getSeries']);
				}, 250);
				break;
			default:
				console.warn('Unknown JobEvent', data);
				console.debug(data);
				break;
		}
	}

	useJobsListener({ onEvent: handleJobEvent });
}
