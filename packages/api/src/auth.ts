import type { LoginOrRegisterArgs, User } from '@stump/types'

import { API } from '.'
import { ApiResult } from './types'

// TODO: types

export function me(): Promise<ApiResult<User>> {
	return API.get('/auth/me')
}

export function login(input: LoginOrRegisterArgs): Promise<ApiResult<User>> {
	return API.post('/auth/login', input)
}

export function register(payload: LoginOrRegisterArgs) {
	return API.post('/auth/register', payload)
}

export function logout(): Promise<ApiResult<never>> {
	return API.post('/auth/logout')
}
