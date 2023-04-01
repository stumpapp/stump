import type { JobReport } from '@stump/types'

import { API } from '.'
import { ApiResult } from './types'

export function getJobs(): Promise<ApiResult<JobReport[]>> {
	return API.get('/jobs')
}

// TODO: type this
export function cancelJob(id: string): Promise<ApiResult<unknown>> {
	return API.delete(`/jobs/${id}/cancel`)
}

const jobApi = {
	cancelJob,
	getJobs,
}

export const jobQueryKeys: Record<keyof typeof jobApi, string> = {
	cancelJob: 'job.cancelJob',
	getJobs: 'job.get',
}
