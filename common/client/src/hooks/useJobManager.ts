import type { CoreEvent } from '../types';
import { queryClient } from '../client';
import { useJobStore } from '../stores';
import { useJobsListener } from './useJobsListener';

interface UseJobManagerParams {
	onJobComplete?: (jobId: string) => void;
	// FIXME: camelCase
	onJobFailed?: (err: { runner_id: string; message: string }) => void;
}

export function useJobManager({ onJobComplete, onJobFailed }: UseJobManagerParams = {}) {
	const { addJob, updateJob, completeJob } = useJobStore();

	function handleJobEvent(event: CoreEvent) {
		const { key, data } = event;

		if (['JobComplete', 'JobFailed'].includes(key)) {
			queryClient.invalidateQueries(['getJobReports']);
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

					queryClient.invalidateQueries(['getLibrary']);
					queryClient.invalidateQueries(['getLibrariesStats']);
					queryClient.invalidateQueries(['getSeries']);
					// toast.success(`Job ${data} complete.`);
					onJobComplete?.(data);
				}, 500);
				break;
			case 'JobFailed':
				// toast.error(`Job ${data.runner_id} failed.`);
				onJobFailed?.(data);
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
					queryClient.invalidateQueries(['getLibrary']);
					queryClient.invalidateQueries(['getLibrariesStats']);
					queryClient.invalidateQueries(['getSeries']);
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
