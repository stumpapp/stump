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
