import { type Browser, type Page } from '@playwright/test'
import { UserPermission } from '@stump/graphql'

import { API_URL, authStatePath } from './personas'

export type EphemeralUserInput = {
	username: string
	password: string
	permissions: UserPermission[]
}

export type CreatedEphemeralUser = {
	id: string
	/**
	 * an authenticated context for the created user
	 */
	page: Page
	/**
	 * a cleanup function that will handle deleting the user and closing the context
	 */
	cleanup: () => Promise<void>
}

/**
 * create an ephemeral test user to be used for tests which are too specific to use
 * a persistent persona
 *
 * @example
 * ```ts
 * let user: CreatedEphemeralUser
 *
 * test.beforeAll(async ({ browser }) => {
 *   user = await createTestUser(browser, {
 *     username: 'read-users',
 *     password: 'password',
 *     permissions: [UserPermission.ReadUsers],
 *   })
 * })
 *
 * test.afterAll(async () => {
 *   await user.cleanup()
 * })
 *
 * test('...', async () => {
 *   await user.page.goto('/settings/users')
 * })
 * ```
 */
export async function createTestUser(
	browser: Browser,
	input: EphemeralUserInput,
): Promise<CreatedEphemeralUser> {
	const adminCtx = await browser.newContext({ storageState: authStatePath('admin') })
	const adminPage = await adminCtx.newPage()

	const listResponse = await adminPage.request.post(`${API_URL}/api/graphql`, {
		data: {
			query: `
				query E2EListUsers {
					users(pagination: { none: { unpaginated: true } }) {
						nodes { id username }
					}
				}
			`,
		},
	})
	const listData = await listResponse.json()
	const existing = (listData?.data?.users?.nodes ?? []).find(
		(u: { id: string; username: string }) => u.username === input.username,
	)
	if (existing) {
		await adminPage.request.post(`${API_URL}/api/graphql`, {
			data: {
				query: `
					mutation E2EDeleteUser($id: ID!) {
						deleteUser(id: $id, hardDelete: true)
					}
				`,
				variables: { id: existing.id },
			},
		})
	}

	const createResponse = await adminPage.request.post(`${API_URL}/api/graphql`, {
		data: {
			query: `
				mutation E2ECreateUser($input: CreateUserInput!) {
					createUser(input: $input) { id }
				}
			`,
			variables: {
				input: {
					username: input.username,
					password: input.password,
					permissions: input.permissions,
				},
			},
		},
	})
	const createData = await createResponse.json()
	const id: string = createData?.data?.createUser?.id
	if (!id) {
		throw new Error(
			`Failed to create ephemeral user "${input.username}": ${JSON.stringify(createData)}`,
		)
	}
	await adminCtx.close()

	// we create the context for this newly created user and log in so tests don't have to worry about it
	const userCtx = await browser.newContext()
	const userPage = await userCtx.newPage()

	const loginRes = await userPage.request.post(`${API_URL}/api/v2/auth/login`, {
		data: { username: input.username, password: input.password },
	})
	if (!loginRes.ok()) {
		throw new Error(`Login failed for ephemeral user "${input.username}": ${await loginRes.text()}`)
	}

	async function cleanup() {
		const cleanupAdminCtx = await browser.newContext({ storageState: authStatePath('admin') })
		const cleanupAdminPage = await cleanupAdminCtx.newPage()

		await cleanupAdminPage.request.post(`${API_URL}/api/graphql`, {
			data: {
				query: `
					mutation E2EDeleteUser($id: ID!) {
						deleteUser(id: $id, hardDelete: true)
					}
				`,
				variables: { id },
			},
		})

		await cleanupAdminCtx.close()
		await userCtx.close()
	}

	return { id, page: userPage, cleanup }
}
