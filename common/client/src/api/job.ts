import { ApiResult, JobReport } from '@stump/core';
import { API } from '.';

export function getJobs(): Promise<ApiResult<JobReport[]>> {
	return API.get('/jobs');
}
