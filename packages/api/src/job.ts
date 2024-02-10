import type { JobSchedulerConfig, PersistedJob, UpdateSchedulerConfig } from '@stump/types'

import { API } from './axios'
import { APIResult, PageableAPIResult } from './types'
import { toUrlParams } from './utils'

export function getJobs(
	params?: Record<string, unknown>,
): Promise<PageableAPIResult<PersistedJob[]>> {
	if (params) {
		const searchParams = toUrlParams(params)
		return API.get(`/jobs?${searchParams.toString()}`)
	} else {
		return API.get('/jobs')
	}
}

export function cancelJob(id: string): Promise<APIResult<void>> {
	return API.delete(`/jobs/${id}/cancel`)
}

export function deleteJob(id: string): Promise<APIResult<void>> {
	return API.delete(`/jobs/${id}`)
}

export function deleteAllJobs(): Promise<APIResult<void>> {
	return API.delete('/jobs')
}

export function getJobSchedulerConfig(): Promise<APIResult<JobSchedulerConfig>> {
	return API.get('/jobs/scheduler-config')
}

export function updateJobSchedulerConfig(
	config: UpdateSchedulerConfig,
): Promise<APIResult<JobSchedulerConfig>> {
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
