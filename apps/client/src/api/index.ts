import axios from 'axios';

export const baseURL = import.meta.env.PROD
	? `${import.meta.env.BASE_URL}api`
	: 'http://localhost:10801/api';
// :'http://192.168.0.81:10801/api';

const API = axios.create({
	baseURL,
	withCredentials: true,
});

export default API;
