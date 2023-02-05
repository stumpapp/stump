import { JobUpdate } from '@stump/types'
import { ReactElement, useState } from 'react'

import { queryClient, QueryClientProvider } from './client'
import {
	ActiveJobContext,
	QueryClientContext,
	StumpClientContext,
	StumpClientContextProps,
} from './context'

type Props = {
	children: ReactElement
} & StumpClientContextProps
export function StumpClientContextProvider({ children, onRedirect }: Props) {
	// lol this is so scuffed
	return (
		<StumpClientContext.Provider value={{ onRedirect }}>
			<QueryClientContext.Provider value={queryClient}>
				<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
			</QueryClientContext.Provider>
		</StumpClientContext.Provider>
	)
}

export function JobContextProvider({ children }: { children: ReactElement }) {
	const [jobs, setJobs] = useState<Record<string, JobUpdate>>({})

	function addJob(newJob: JobUpdate) {
		const job = jobs[newJob.runner_id]

		if (job) {
			updateJob(newJob)
		} else {
			setJobs((jobs) => ({
				...jobs,
				[newJob.runner_id]: newJob,
			}))
		}
	}

	function updateJob(jobUpdate: JobUpdate) {
		const job = jobs[jobUpdate.runner_id]

		if (!job || !Object.keys(jobs).length) {
			addJob(jobUpdate)
			return
		}

		const { current_task, message, task_count } = jobUpdate
		const updatedJob = {
			...job,
			current_task,
			message,
			task_count,
		}

		setJobs((jobs) => ({
			...jobs,
			[jobUpdate.runner_id]: updatedJob,
		}))
	}

	function removeJob(jobId: string) {
		setJobs((jobs) => {
			const newJobs = { ...jobs }
			delete newJobs[jobId]
			return newJobs
		})
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
	)
}
