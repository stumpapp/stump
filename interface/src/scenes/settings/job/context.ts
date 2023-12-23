import { JobDetail } from '@stump/types'
import { PaginationState } from '@tanstack/react-table'
import { createContext, useContext } from 'react'

import { noop } from '../../../utils/misc'

export type IJobSettingsContext = {
	jobs: JobDetail[]
	isRefetchingJobs: boolean
	pageCount: number
	pagination: PaginationState
	setPagination: React.Dispatch<React.SetStateAction<PaginationState>>
}

export const JobSettingsContext = createContext<IJobSettingsContext>({
	isRefetchingJobs: false,
	jobs: [],
	pageCount: 0,
	pagination: {
		pageIndex: 0,
		pageSize: 10,
	},
	setPagination: noop,
})
export const useJobSettingsContext = () => useContext(JobSettingsContext)
