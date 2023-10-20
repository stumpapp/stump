import type {
	LoginActivity,
	LoginOrRegisterArgs,
	UpdateUser,
	User,
	UserPreferences,
} from '@stump/types'

import { API } from './axios'
import { ApiResult, PageableApiResult } from './types'
import { toUrlParams } from './utils'

export function getUsers(params?: Record<string, unknown>): Promise<PageableApiResult<User[]>> {
	if (params) {
		const searchParams = toUrlParams(params)
		return API.get(`/users?${searchParams.toString()}`)
	} else {
		return API.get('/users')
	}
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

export function createUser(params: LoginOrRegisterArgs): Promise<ApiResult<User>> {
	return API.post(`/users`, params)
}

export function updateUser(userId: string, params: UpdateUser): Promise<ApiResult<User>> {
	return API.put(`/users/${userId}`, params)
}

export function updateViewer(params: UpdateUser): Promise<ApiResult<User>> {
	return API.put(`/users/me`, params)
}

type DeleteUser = {
	userId: string
	hardDelete?: boolean
}

export function deleteUser({ userId, hardDelete }: DeleteUser): Promise<ApiResult<User>> {
	return API.delete(`/users/${userId}`, {
		data: {
			hard_delete: hardDelete,
		},
	})
}

export function getLoginActivityForUser(userId: string): Promise<ApiResult<LoginActivity[]>> {
	return API.get(`/users/${userId}/login-activity`)
}

export function getLoginActivity(): Promise<ApiResult<LoginActivity[]>> {
	return API.get(`/users/login-activity`)
}

export function deleteAllLoginActivity(): Promise<ApiResult<void>> {
	return API.delete(`/users/login-activity`)
}

export function setLockStatus(userId: string, lock: boolean): Promise<ApiResult<User>> {
	return API.put(`/users/${userId}/lock`, {
		lock,
	})
}

export const userApi = {
	createUser,
	deleteAllLoginActivity,
	deleteUser,
	getLoginActivity,
	getLoginActivityForUser,
	getUserPreferences,
	getUsers,
	setLockStatus,
	updatePreferences,
	updateUser,
	updateUserPreferences,
	updateViewer,
}

export const userQueryKeys: Record<keyof typeof userApi, string> = {
	createUser: 'user.createUser',
	deleteAllLoginActivity: 'user.deleteAllLoginActivity',
	deleteUser: 'user.deleteUser',
	getLoginActivity: 'user.getLoginActivity',
	getLoginActivityForUser: 'user.getLoginActivityForUser',
	getUserPreferences: 'user.getUserPreferences',
	getUsers: 'user.getUsers',
	setLockStatus: 'user.setLockStatus',
	updatePreferences: 'user.updatePreferences',
	updateUser: 'user.updateUser',
	updateUserPreferences: 'user.updateUserPreferences',
	updateViewer: 'user.updateViewer',
}
