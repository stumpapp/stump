import axios from 'axios';

export const baseURL = (import.meta.env.VITE_API_URL as string) || 'http://localhost:6969/api';

const API = axios.create({
	baseURL,
	withCredentials: true,
});

export default API;
