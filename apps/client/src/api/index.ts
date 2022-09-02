import axios from 'axios';

// TODO: look into alternative solution. I would like to potentially add a tauri desktop
// app OR mobile app maybe? and that would require this baseURL to be determined by
// some sort of state and not necessarily an environment variable. This will almost definitely
// be after v0.1
export const baseURL = import.meta.env.PROD
	? `${import.meta.env.BASE_URL}api`
	: 'http://localhost:10801/api';

const API = axios.create({
	baseURL,
	withCredentials: true,
});

export default API;

// export function updateAxiosInstance(newBaseURL: string) {
// 	API = axios.create({
// 		baseURL:newBaseURL,
// 		withCredentials: true,
// 	})
// }
