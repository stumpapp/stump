import type { UpdateUserArgs, User, UserPreferences } from '@stump/types'

import { API } from '.'
import { ApiResult } from './types'

export function getUserPreferences(userId: string): Promise<ApiResult<UserPreferences>> {
	return API.get(`/users/${userId}/preferences`)
}

export function updateUserPreferences(
	userId: string,
	preferences: UserPreferences,
): Promise<ApiResult<UserPreferences>> {
	return API.put(`/users/${userId}/preferences`, preferences)
}

export function updateUser(userId: string, params: UpdateUserArgs): Promise<ApiResult<User>> {
	return API.put(`/users/${userId}`, params)
}
