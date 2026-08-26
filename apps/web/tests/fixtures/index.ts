import { type Page, test as base } from '@playwright/test'

import { authStatePath, type PersonaName } from '../users/personas'

type PersonaFixtures = {
	[K in PersonaName as `${K}Page`]: Page
}

/**
 * extends the base test with fixtures for each persona, so when requested in a spec
 * the session exists and user is authed
 */
export const test = base.extend<PersonaFixtures>({
	adminPage: async ({ browser }, give) => {
		const ctx = await browser.newContext({ storageState: authStatePath('admin') })
		await give(await ctx.newPage())
		await ctx.close()
	},
})

// re-export just so imports for `test` and `expect` are consistent
export { expect } from '@playwright/test'
