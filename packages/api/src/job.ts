import type { JobDetail } from '@stump/types'

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

export const jobApi = {
	cancelJob,
	deleteAllJobs,
	deleteJob,
	getJobs,
}

export const jobQueryKeys: Record<keyof typeof jobApi, string> = {
	cancelJob: 'job.cancelJob',
	deleteAllJobs: 'job.deleteAll',
	deleteJob: 'job.delete',
	getJobs: 'job.get',
}
