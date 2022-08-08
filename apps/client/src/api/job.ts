import API from '.';

export function getJobs() {
	return API.get('/jobs');
}
