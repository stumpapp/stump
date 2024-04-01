import type { LoginOrRegisterArgs, User } from '@stump/types'

import { API } from './axios'
import { APIResult } from './types'

// TODO: types

export function me(): Promise<APIResult<User>> {
	return API.get('/auth/me')
}

export function login(input: LoginOrRegisterArgs): Promise<APIResult<User>> {
	return API.post('/auth/login', input)
}

export function register(payload: LoginOrRegisterArgs): Promise<APIResult<User>> {
	return API.post('/auth/register', payload)
}

export function logout(): Promise<APIResult<never>> {
	return API.post('/auth/logout')
}

export const authApi = {
	login,
	logout,
	me,
	register,
}

export const authQueryKeys: Record<keyof typeof authApi, string> = {
	login: 'auth.login',
	logout: 'auth.logout',
	me: 'auth.me',
	register: 'auth.register',
}
