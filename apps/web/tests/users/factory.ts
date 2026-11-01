import { type Browser, type Page } from '@playwright/test'

import { API_URL, executeGql } from '../fixtures/gql'
import { authStatePath, TestUser } from './personas'

// TODO: rename UserFixture?
export type CreatedTestUser = {
	id: string
	/**
	 * an authenticated context for the created user
	 */
	page: Page
	/**
	 * a cleanup function that will handle deleting the user and closing the context
	 */
	cleanup: () => Promise<void>
} & TestUser

/**
 * create an ephemeral test user to be used for tests which are too specific to use
 * a persistent persona
 *
 * @example
 * ```ts
 * let user: CreatedTestUser
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
export async function createTestUser(browser: Browser, input: TestUser): Promise<CreatedTestUser> {
	const id = await runAsAdmin(browser, (adminPage) => ensureUser(adminPage, input))

	// we create the context for this newly created user and log in so tests don't have to worry about it
	const userCtx = await browser.newContext()
	const userPage = await userCtx.newPage()

	login(userPage, input)

	async function cleanup() {
		await runAsAdmin(browser, async (adminPage) => {
			await executeGql(
				adminPage,
				`mutation E2EDeleteUser($id: ID!) { deleteUser(id: $id, hardDelete: true) }`,
				{ id },
			)
		})
		await userCtx.close()
	}

	return { id, page: userPage, cleanup, ...input }
}

/**
 * delete and then recreate the user, ensuring a fresh state each time called
 */
export async function ensureUser(adminPage: Page, input: TestUser): Promise<string> {
	const listData = await executeGql<{ users: { nodes: { id: string; username: string }[] } }>(
		adminPage,
		`
				query E2EListUsers {
					users(pagination: { none: { unpaginated: true } }) {
						nodes { id username }
					}
				}
			`,
	)
	const existing = listData.users.nodes.find((u) => u.username === input.username)
	if (existing) {
		await executeGql(
			adminPage,
			`
					mutation E2EDeleteUser($id: ID!) {
						deleteUser(id: $id, hardDelete: true)
					}
				`,
			{ id: existing.id },
		)
	}

	const createData = await executeGql<{ createUser: { id: string } }>(
		adminPage,
		`mutation E2ECreateUser($input: CreateUserInput!) {
			createUser(input: $input) { id }
		}`,
		{
			input: {
				username: input.username,
				password: input.password,
				permissions: input.permissions,
			},
		},
	)

	const id = createData.createUser.id
	if (!id) {
		throw new Error(`Failed to create test user "${input.username}": ${JSON.stringify(createData)}`)
	}
	return id
}

/** log in the user or error if the attempt was not successful */
export async function login(page: Page, user: Omit<TestUser, 'permissions'>) {
	const loginRes = await page.request.post(`${API_URL}/api/v2/auth/login`, {
		data: { username: user.username, password: user.password },
	})
	if (!loginRes.ok()) {
		throw new Error(`Login failed for test user "${user.username}": ${await loginRes.text()}`)
	}
}

/**
 * run `fn` with an admin-authed page
 */
export async function runAsAdmin<T>(
	browser: Browser,
	fn: (adminPage: Page) => Promise<T>,
): Promise<T> {
	const ctx = await browser.newContext({ storageState: authStatePath('admin') })
	try {
		return await fn(await ctx.newPage())
	} finally {
		await ctx.close()
	}
}
