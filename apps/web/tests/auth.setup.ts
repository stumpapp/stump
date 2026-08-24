import { expect, test as setup } from '@playwright/test'

import { API_URL, authStatePath, personas } from './users/personas'

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
