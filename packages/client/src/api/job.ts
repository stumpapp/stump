import type { ApiResult, JobReport } from '../types';
import { API } from '.';

export function getJobs(): Promise<ApiResult<JobReport[]>> {
	return API.get('/jobs');
}

// TODO: type this
export function cancelJob(id: string): Promise<ApiResult<unknown>> {
	return API.delete(`/jobs/${id}/cancel`);
}
