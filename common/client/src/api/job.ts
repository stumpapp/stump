import type { ApiResult, JobReport } from '../types';
import { API } from '.';

export function getJobs(): Promise<ApiResult<JobReport[]>> {
	return API.get('/jobs');
}
