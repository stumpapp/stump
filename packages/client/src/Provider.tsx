import { QueryClientProvider } from '@tanstack/react-query';
import { ReactElement, useState } from 'react';

import { queryClient } from './client';
import { ActiveJobContext, StumpQueryContext } from './context';
import { JobUpdate } from './types';

export function StumpQueryProvider({ children }: { children: ReactElement }) {
	return (
		<StumpQueryContext.Provider value={queryClient}>
			<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
		</StumpQueryContext.Provider>
	);
}

export function JobContextProvider({ children }: { children: ReactElement }) {
	const [jobs, setJobs] = useState<Record<string, JobUpdate>>({});

	function addJob(newJob: JobUpdate) {
		const job = jobs[newJob.runner_id];

		if (job) {
			updateJob(newJob);
		} else {
			setJobs((jobs) => ({
				...jobs,
				[newJob.runner_id]: newJob,
			}));
		}
	}

	function updateJob(jobUpdate: JobUpdate) {
		let job = jobs[jobUpdate.runner_id];

		if (!job || !Object.keys(jobs).length) {
			addJob(jobUpdate);
			return;
		}

		const { current_task, message, task_count } = jobUpdate;
		job = {
			...job,
			current_task,
			message,
			task_count,
		};

		setJobs((jobs) => ({
			...jobs,
			[jobUpdate.runner_id]: job,
		}));
	}

	function removeJob(jobId: string) {
		setJobs((jobs) => {
			const newJobs = { ...jobs };
			delete newJobs[jobId];
			return newJobs;
		});
	}

	return (
		<ActiveJobContext.Provider
			value={{
				activeJobs: jobs,
				addJob,
				removeJob,
				updateJob,
			}}
		>
			{children}
		</ActiveJobContext.Provider>
	);
}
