import type {
	Arrangement,
	CreateUser,
	LoginActivity,
	NavigationItem,
	UpdateUser,
	UpdateUserPreferences,
	User,
	UserPreferences,
} from '@stump/types'

import { API } from './axios'
import { APIResult, PageableAPIResult } from './types'
import { toUrlParams } from './utils'

export function getUsers(params?: Record<string, unknown>): Promise<PageableAPIResult<User[]>> {
	if (params) {
		const searchParams = toUrlParams(params)
		return API.get(`/users?${searchParams.toString()}`)
	} else {
		return API.get('/users')
	}
}

export function getUserById(userId: string): Promise<APIResult<User>> {
	return API.get(`/users/${userId}`)
}

export function getUserPreferences(userId: string): Promise<APIResult<UserPreferences>> {
	return API.get(`/users/${userId}/preferences`)
}

/**
 * Update the current user's preferences
 */
export function updatePreferences(
	preferences: UpdateUserPreferences,
): Promise<APIResult<UserPreferences>> {
	return API.put(`/users/me/preferences`, preferences)
}

/**
 * Update the a user's preferences by their ID
 */
export function updateUserPreferences(
	userId: string,
	preferences: UserPreferences,
): Promise<APIResult<UserPreferences>> {
	return API.put(`/users/${userId}/preferences`, preferences)
}

export function createUser(params: CreateUser): Promise<APIResult<User>> {
	return API.post(`/users`, params)
}

export function updateUser(userId: string, params: UpdateUser): Promise<APIResult<User>> {
	return API.put(`/users/${userId}`, params)
}

export function updateViewer(params: UpdateUser): Promise<APIResult<User>> {
	return API.put(`/users/me`, params)
}

type DeleteUser = {
	userId: string
	hardDelete?: boolean
}

export function deleteUser({ userId, hardDelete }: DeleteUser): Promise<APIResult<User>> {
	return API.delete(`/users/${userId}`, {
		data: {
			hard_delete: hardDelete,
		},
	})
}

export function getLoginActivityForUser(userId: string): Promise<APIResult<LoginActivity[]>> {
	return API.get(`/users/${userId}/login-activity`)
}

export function getLoginActivity(): Promise<APIResult<LoginActivity[]>> {
	return API.get(`/users/login-activity`)
}

export function deleteAllLoginActivity(): Promise<APIResult<void>> {
	return API.delete(`/users/login-activity`)
}

export function setLockStatus(userId: string, lock: boolean): Promise<APIResult<User>> {
	return API.put(`/users/${userId}/lock`, {
		lock,
	})
}

export function deleteUserSessions(userId: string): Promise<APIResult<void>> {
	return API.delete(`/users/${userId}/sessions`)
}

export function getPreferredNavigationArrangement(): Promise<
	APIResult<Arrangement<NavigationItem>>
> {
	return API.get('/users/me/navigation-arrangement')
}

export function setPreferredNavigationArrangement(
	arrangement: Arrangement<NavigationItem>,
): Promise<APIResult<Arrangement<NavigationItem>>> {
	return API.put('/users/me/navigation-arrangement', arrangement)
}

export const userApi = {
	createUser,
	deleteAllLoginActivity,
	deleteUser,
	deleteUserSessions,
	getLoginActivity,
	getLoginActivityForUser,
	getPreferredNavigationArrangement,
	getUserById,
	getUserPreferences,
	getUsers,
	setLockStatus,
	setPreferredNavigationArrangement,
	updatePreferences,
	updateUser,
	updateUserPreferences,
	updateViewer,
}

export const userQueryKeys: Record<keyof typeof userApi, string> = {
	createUser: 'user.createUser',
	deleteAllLoginActivity: 'user.deleteAllLoginActivity',
	deleteUser: 'user.deleteUser',
	deleteUserSessions: 'user.deleteUserSessions',
	getLoginActivity: 'user.getLoginActivity',
	getLoginActivityForUser: 'user.getLoginActivityForUser',
	getPreferredNavigationArrangement: 'user.getPreferredNavigationArrangement',
	getUserById: 'user.getUserById',
	getUserPreferences: 'user.getUserPreferences',
	getUsers: 'user.getUsers',
	setLockStatus: 'user.setLockStatus',
	setPreferredNavigationArrangement: 'user.setPreferredNavigationArrangement',
	updatePreferences: 'user.updatePreferences',
	updateUser: 'user.updateUser',
	updateUserPreferences: 'user.updateUserPreferences',
	updateViewer: 'user.updateViewer',
}
