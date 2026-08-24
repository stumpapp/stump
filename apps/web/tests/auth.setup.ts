import { expect, test as setup } from '@playwright/test'

import { API_URL, authStatePath, personas } from './personas'

// the setup blocks otherwise run in parallel, but the first admin account must be created
// first since it creates the others
setup.describe.configure({ mode: 'serial' })

setup('create the first admin account', async ({ request }) => {
	await request.post(`${API_URL}/api/v2/auth/register`, {
		data: {
			username: personas.admin.username,
			password: personas.admin.password,
		},
	})

	const loginRes = await request.post(`${API_URL}/api/v2/auth/login`, {
		data: {
			username: personas.admin.username,
			password: personas.admin.password,
		},
	})
	expect(loginRes.ok(), `admin login failed: ${await loginRes.text()}`).toBeTruthy()

	await request.storageState({ path: authStatePath('admin') })
})

setup('create moderator account', async ({ browser }) => {
	const adminSession = await browser.newContext({ storageState: authStatePath('admin') })
	const adminCtx = await adminSession.newPage()

	const createResponse = await adminCtx.request.post(`${API_URL}/api/graphql`, {
		data: {
			query: `
				mutation CreateE2EModeratorAccount($input: CreateUserInput!) {
					createUser(input: $input) { id }
				}
			`,
			variables: {
				input: {
					username: personas.moderator.username,
					password: personas.moderator.password,
					permissions: personas.moderator.permissions,
				},
			},
		},
	})
	expect(
		createResponse.ok(),
		`moderator create failed: ${await createResponse.text()}`,
	).toBeTruthy()
	await adminCtx.close()

	const userCtx = await browser.newContext()
	const userPage = await userCtx.newPage()

	const loginRes = await userPage.request.post(`${API_URL}/api/v2/auth/login`, {
		data: {
			username: personas.moderator.username,
			password: personas.moderator.password,
		},
	})
	expect(loginRes.ok(), `moderator login failed: ${await loginRes.text()}`).toBeTruthy()

	await userPage.request.storageState({ path: authStatePath('moderator') })
	await userCtx.close()
})
