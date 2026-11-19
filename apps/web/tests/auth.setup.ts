import { expect, test as setup } from '@playwright/test'

import { API_URL } from './fixtures/gql'
import { ensureUser, login, runAsAdmin } from './users/factory'
import { authStatePath, personas } from './users/personas'

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

// now that we have the admin we can use that account to create the rest of the
// named personas referenced throughout the suites
for (const [persona, user] of Object.entries(personas)) {
	if (persona === 'admin') continue

	setup(`create the ${persona} persona`, async ({ browser }) => {
		await runAsAdmin(browser, (page) => ensureUser(page, user))

		const ctx = await browser.newContext()
		const page = await ctx.newPage()

		await login(page, user)

		await page.request.storageState({ path: authStatePath(persona) })
		await ctx.close()
	})
}
