import {
	Arrangement,
	CreateUser,
	LoginActivity,
	NavigationItem,
	Pageable,
	PaginationQuery,
	UpdateUser,
	UpdateUserPreferences,
	User,
	UserPreferences,
	UserQueryRelation,
} from '@stump/types'

import { APIBase } from '../base'
import { createRouteURLHandler } from './utils'

/**
 * The root route for the user API
 */
const USER_ROUTE = '/users'
/**
 * A helper function to format the URL for user API routes with optional query parameters
 */
const userURL = createRouteURLHandler(USER_ROUTE)

/**
 * The user API controller, used for interacting with the user endpoints of the Stump API
 */
export class UserAPI extends APIBase {
	/**
	 * Fetch all users with optional query parameters
	 */
	async get(params?: UserQueryRelation & PaginationQuery): Promise<Pageable<User[]>> {
		const { data: users } = await this.axios.get<Pageable<User[]>>(userURL('', params))
		return users
	}

	/**
	 * Fetch a user by ID
	 */
	async getByID(id: string): Promise<User> {
		const { data: user } = await this.axios.get<User>(userURL(id))
		return user
	}

	/**
	 * Fetch a user's preferences by ID
	 */
	async getUserPreferences(id: string): Promise<UserPreferences> {
		const { data: preferences } = await this.axios.get<UserPreferences>(
			userURL(`${id}/preferences`),
		)
		return preferences
	}

	/**
	 * Update a user's preferences by ID
	 */
	async updateUserPreferences(
		id: string,
		payload: UpdateUserPreferences,
	): Promise<UserPreferences> {
		const { data: preferences } = await this.axios.patch<UserPreferences>(
			userURL(`${id}/preferences`),
			payload,
		)
		return preferences
	}

	/**
	 * Fetch the current authenticated user's preferences
	 */
	async preferences(): Promise<UserPreferences> {
		const { data: preferences } = await this.axios.get<UserPreferences>(userURL('/me/preferences'))
		return preferences
	}

	/**
	 * Update the current authenticated user's preferences
	 */
	async updatePreferences(payload: UpdateUserPreferences): Promise<UserPreferences> {
		const { data: preferences } = await this.axios.patch<UserPreferences>(
			userURL('/me/preferences'),
			payload,
		)
		return preferences
	}

	/**
	 * Fetch the current authenticated user's navigation arrangement
	 */
	async navigationArrangement(): Promise<Arrangement<NavigationItem>> {
		const { data: arrangement } = await this.axios.get<Arrangement<NavigationItem>>(
			userURL('/me/navigation-arrangement'),
		)
		return arrangement
	}

	/**
	 * Update the current authenticated user's navigation arrangement
	 */
	async updateNavigationArrangement(
		payload: Arrangement<NavigationItem>,
	): Promise<Arrangement<NavigationItem>> {
		const { data: arrangement } = await this.axios.put<Arrangement<NavigationItem>>(
			userURL('/me/navigation-arrangement'),
			payload,
		)
		return arrangement
	}

	/**
	 * Create a new user
	 */
	async create(payload: CreateUser): Promise<User> {
		const { data: user } = await this.axios.post<User>(userURL(''), payload)
		return user
	}

	/**
	 * Update a user by ID
	 */
	async update(id: string, payload: UpdateUser): Promise<User> {
		const { data: user } = await this.axios.put<User>(userURL(id), payload)
		return user
	}

	/**
	 * Update the current authenticated user
	 */
	async updateViewer(payload: UpdateUser): Promise<User> {
		const { data: user } = await this.axios.put<User>(userURL('/me'), payload)
		return user
	}

	/**
	 * Delete a user by ID. This can be a soft or hard delete
	 */
	async delete(id: string, { hardDelete }: { hardDelete?: boolean } = {}): Promise<User> {
		const { data: deletedUser } = await this.axios.delete(userURL(id), {
			data: {
				hard_delete: hardDelete,
			},
		})
		return deletedUser
	}

	/**
	 * Fetch the login activity for a user by ID or for all users
	 */
	async loginActivity(forUser?: string): Promise<LoginActivity[]> {
		const { data: activity } = await this.axios.get<LoginActivity[]>(
			userURL(`${forUser || ''}/login-activity`),
		)
		return activity
	}

	/**
	 * Delete all login activity for all users
	 */
	async deleteLoginActivity(): Promise<void> {
		await this.axios.delete(userURL('login-activity'))
	}

	/**
	 * Lock or unlock a user by ID
	 */
	async lockUser(forUser: string, lock: boolean): Promise<User> {
		const { data: updatedUser } = await this.axios.put<User>(userURL(forUser), {
			lock,
		})
		return updatedUser
	}

	/**
	 * Fetch all user sessions
	 */
	async deleteUserSessions(forUser: string): Promise<void> {
		await this.axios.delete(userURL(`${forUser}/sessions`))
	}
}
