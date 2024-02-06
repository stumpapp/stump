import { jobQueryKeys } from '@stump/api'
import { JobUpdate } from '@stump/types'
import { ReactElement, useState } from 'react'

import { queryClient, QueryClientProvider } from './client'
import {
	JobContext,
	QueryClientContext,
	StumpClientContext,
	StumpClientContextProps,
} from './context'
import { invalidateQueries } from './invalidate'

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
			const target = jobs[newJob.id]

			if (target) {
				return {
					...jobs,
					[newJob.id]: {
						...target,
						...newJob,
					},
				}
			} else {
				return {
					...jobs,
					[newJob.id]: newJob,
				}
			}
		})

		invalidateQueries({ queryKey: [jobQueryKeys.getJobs] })
	}

	function updateJob(jobUpdate: JobUpdate) {
		setJobs((jobs) => {
			const target = jobs[jobUpdate.id]

			if (target) {
				return {
					...jobs,
					[jobUpdate.id]: {
						...target,
						...jobUpdate,
					},
				}
			} else {
				return {
					...jobs,
					[jobUpdate.id]: jobUpdate,
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
