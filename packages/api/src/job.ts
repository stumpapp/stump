import type { JobDetail, Library } from '@stump/types'

import { API, toUrlParams } from '.'
import { ApiResult, PageableApiResult } from './types'

export function getJobs(params?: Record<string, unknown>): Promise<PageableApiResult<JobDetail[]>> {
	if (params) {
		const searchParams = toUrlParams(params)
		return API.get(`/jobs?${searchParams.toString()}`)
	} else {
		return API.get('/jobs')
	}
}

export function cancelJob(id: string): Promise<ApiResult<void>> {
	return API.delete(`/jobs/${id}/cancel`)
}

export function deleteJob(id: string): Promise<ApiResult<void>> {
	return API.delete(`/jobs/${id}`)
}

export function deleteAllJobs(): Promise<ApiResult<void>> {
	return API.delete('/jobs')
}

// TODO: types!
export function getJobSchedulerConfig(): Promise<
	ApiResult<{
		id: string
		interval_secs: number
		excluded_libraries: Library[]
	}>
> {
	return API.get('/jobs/scheduler-config')
}

// TODO: types!
type UpdateJobSchedulerConfig = {
	interval_secs?: number
	excluded_library_ids?: string[]
}
export function updateJobSchedulerConfig(config: UpdateJobSchedulerConfig) {
	return API.post('/jobs/scheduler-config', config)
}

export const jobApi = {
	cancelJob,
	deleteAllJobs,
	deleteJob,
	getJobSchedulerConfig,
	getJobs,
	updateJobSchedulerConfig,
}

export const jobQueryKeys: Record<keyof typeof jobApi, string> = {
	cancelJob: 'job.cancelJob',
	deleteAllJobs: 'job.deleteAll',
	deleteJob: 'job.delete',
	getJobSchedulerConfig: 'job.getSchedulerConfig',
	getJobs: 'job.get',
	updateJobSchedulerConfig: 'job.updateSchedulerConfig',
}
