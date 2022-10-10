import type { CoreEvent } from '../types';
import { queryClient } from '../client';
import { useStumpSse } from './useStumpSse';
import { useJobContext } from '../context';

interface UseCoreEventHandlerParams {
	onJobComplete?: (jobId: string) => void;
	onJobFailed?: (err: { runner_id: string; message: string }) => void;
}

export function useCoreEventHandler({
	onJobComplete,
	onJobFailed,
}: UseCoreEventHandlerParams = {}) {
	const context = useJobContext();

	if (!context) {
		throw new Error('useCoreEventHandler must be used within a JobContext');
	}

	const { addJob, updateJob, removeJob } = context;

	function handleCoreEvent(event: CoreEvent) {
		const { key, data } = event;

		switch (key) {
			case 'JobStarted':
				addJob(data);
				break;
			case 'JobProgress':
				// FIXME:  Testing with a test library containing over 10k cbz files, there are so
				//  many updates that around 2000k it just dies. I have implemented a check to
				// in this store function where if the task_count is greater than 1000, it will
				// only update the store every 50 tasks. This is a temporary fix. The UI is still pretty
				// slow when this happens, but is usable. A better solution needs to be found.
				updateJob(data);
				break;
			case 'JobComplete':
				setTimeout(() => {
					removeJob(data);

					queryClient.invalidateQueries(['getLibrary']);
					queryClient.invalidateQueries(['getLibrariesStats']);
					queryClient.invalidateQueries(['getSeries']);
					queryClient.invalidateQueries(['getJobReports']);

					// toast.success(`Job ${data} complete.`);
					onJobComplete?.(data);
				}, 500);
				break;
			case 'JobFailed':
				onJobFailed?.(data);
				removeJob(data.runner_id);
				queryClient.invalidateQueries(['getJobReports']);

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

	useStumpSse({ onEvent: handleCoreEvent });
}
