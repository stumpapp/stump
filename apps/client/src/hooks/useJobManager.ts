import { JobEvent } from '@stump/core';
import toast from 'react-hot-toast';
import client from '~api/client';
import { useStore } from '~store/store';
import { useJobsListener } from './useJobsListener';

export function useJobManager() {
	const { addJob, updateJob, completeJob } = useStore(({ addJob, updateJob, completeJob }) => ({
		addJob,
		updateJob,
		completeJob,
	}));

	// FIXME: this is disgusting lol
	function handleJobEvent(data: JobEvent) {
		if (!data.CreatedMedia && !data.CreatedSeries && !data.JobProgress) {
			client.invalidateQueries(['getJobReports']);
		}

		if (data.JobStarted) {
			addJob(data.JobStarted);
		} else if (data.JobProgress) {
			updateJob(data.JobProgress);
		} else if (data.JobComplete) {
			// completeJob(data.JobComplete as string);
			setTimeout(() => {
				completeJob(data.JobComplete as string);
				toast.success(`Job ${data.JobComplete} complete.`);
			}, 500);
		} else if (data.JobFailed) {
			setTimeout(() => {
				// completeJob(data.JobComplete as string);
				toast.error(`Job ${data.JobFailed.runner_id} failed.`);
			}, 500);
		} else if (data.CreatedSeries || data.CreatedMedia) {
			// I set a timeout here to give the backend a little time to analyze at least
			// one of the books in a new series before triggering a refetch. This is to
			// prevent the series/media cards from being displayed before there is an image ready.
			setTimeout(() => {
				// TODO: I must misunderstand how this function works. Giving multiple keys
				// does not work, not a huge deal but would rather a one-liner for these.
				client.invalidateQueries(['getLibrary']);
				client.invalidateQueries(['getLibrariesStats']);
			}, 250);

			if (data.CreatedMedia) {
				setTimeout(() => client.invalidateQueries(['getSeries']), 250);
			}
		} else {
			console.log('Unknown JobEvent', data);
			console.log(Object.keys(data));
		}
	}

	useJobsListener({ onEvent: handleJobEvent });
}
