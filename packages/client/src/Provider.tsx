import { jobQueryKeys } from '@stump/api'
import { JobUpdate } from '@stump/types'
import { ReactElement, useState } from 'react'

import { invalidateQueries } from '.'
import { queryClient, QueryClientProvider } from './client'
import {
	JobContext,
	QueryClientContext,
	StumpClientContext,
	StumpClientContextProps,
} from './context'

type Props = {
	children: React.ReactNode
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

// FIXME: This is in desperate need of a refactor / throttling. I've found the UI can easily lock up when thousands
// of tasks are completed per second. The backend is just too quick and there are too many state changes.
export function JobContextProvider({ children }: { children: ReactElement }) {
	const [jobs, setJobs] = useState<Record<string, JobUpdate>>({})

	function addJob(newJob: JobUpdate) {
		setJobs((jobs) => {
			const target = jobs[newJob.job_id]

			if (target) {
				return {
					...jobs,
					[newJob.job_id]: {
						...target,
						...newJob,
					},
				}
			} else {
				return {
					...jobs,
					[newJob.job_id]: newJob,
				}
			}
		})

		invalidateQueries({ queryKey: [jobQueryKeys.getJobs] })
	}

	function updateJob(jobUpdate: JobUpdate) {
		setJobs((jobs) => {
			const target = jobs[jobUpdate.job_id]

			if (target) {
				return {
					...jobs,
					[jobUpdate.job_id]: {
						...target,
						...jobUpdate,
					},
				}
			} else {
				return {
					...jobs,
					[jobUpdate.job_id]: jobUpdate,
				}
			}
		})
	}

	function removeJob(jobId: string) {
		setJobs((jobs) => {
			const newJobs = { ...jobs }
			delete newJobs[jobId]
			return newJobs
		})
	}

	return (
		<JobContext.Provider
			value={{
				activeJobs: jobs,
				addJob,
				removeJob,
				updateJob,
			}}
		>
			{children}
		</JobContext.Provider>
	)
}
