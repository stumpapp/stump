import type { UpdateUserArgs, User, UserPreferences } from '@stump/types'

import { API } from './axios'
import { ApiResult } from './types'

export function getUsers(): Promise<ApiResult<User[]>> {
	return API.get('/users')
}

export function getUserPreferences(userId: string): Promise<ApiResult<UserPreferences>> {
	return API.get(`/users/${userId}/preferences`)
}

/**
 * Update the current user's preferences
 */
export function updatePreferences(
	preferences: UserPreferences,
): Promise<ApiResult<UserPreferences>> {
	return API.put(`/users/me/preferences`, preferences)
}

/**
 * Update the a user's preferences by their ID
 */
export function updateUserPreferences(
	userId: string,
	preferences: UserPreferences,
): Promise<ApiResult<UserPreferences>> {
	return API.put(`/users/${userId}/preferences`, preferences)
}

export function updateUser(userId: string, params: UpdateUserArgs): Promise<ApiResult<User>> {
	return API.put(`/users/${userId}`, params)
}

export function updateViewer(params: UpdateUserArgs): Promise<ApiResult<User>> {
	return API.put(`/users/me`, params)
}

const userApi = {
	getUserPreferences,
	getUsers,
	updatePreferences,
	updateUser,
	updateUserPreferences,
	updateViewer,
}

export const userQueryKeys: Record<keyof typeof userApi, string> = {
	getUserPreferences: 'user.getUserPreferences',
	getUsers: 'user.getUsers',
	updatePreferences: 'user.updatePreferences',
	updateUser: 'user.updateUser',
	updateUserPreferences: 'user.updateUserPreferences',
	updateViewer: 'user.updateViewer',
}
