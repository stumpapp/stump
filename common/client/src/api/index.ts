import axios, { AxiosInstance } from 'axios';

// export const baseURL = import.meta.env.PROD
// 	? `${import.meta.env.BASE_URL}api`
// 	: 'http://localhost:10801/api';

// const API = axios.create({
// 	baseURL,
// 	withCredentials: true,
// });

export let API: AxiosInstance;

export function initializeApi(baseURL: string) {
	API = axios.create({
		baseURL,
		withCredentials: true,
	});
}
// export function updateAxiosInstance(newBaseURL: string) {
// 	API = axios.create({
// 		baseURL:newBaseURL,
// 		withCredentials: true,
// 	})
// }
