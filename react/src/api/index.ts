import axios from 'axios';

export const baseURL = process.env.VITE_API_URL || 'http://localhost:6969';

const API = axios.create({
	baseURL,
	withCredentials: true,
});

export default API;
