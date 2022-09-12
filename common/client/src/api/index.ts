import axios, { AxiosInstance } from 'axios';

export let API: AxiosInstance;

export function initializeApi(baseURL: string) {
	API = axios.create({
		baseURL,
		withCredentials: true,
	});
}
