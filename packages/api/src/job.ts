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

// TODO: type this
export function cancelJob(id: string): Promise<ApiResult<unknown>> {
	return API.delete(`/jobs/${id}/cancel`)
}

export const jobApi = {
	cancelJob,
	getJobs,
}

export const jobQueryKeys: Record<keyof typeof jobApi, string> = {
	cancelJob: 'job.cancelJob',
	getJobs: 'job.get',
}
