import { Browser, type Page, test as base } from '@playwright/test'

import { authStatePath, type Persona, personas } from '../users/personas'

type PersonaFixtures = {
	[K in Persona as `${K}Page`]: Page
}

/**
 * extends the base test with fixtures for each persona, so when requested in a spec
 * the session exists and user is authed
 */
export const test = base.extend<PersonaFixtures>(
	Object.fromEntries(
		(Object.keys(personas) as Persona[]).map((name) => [
			`${name}Page`,
			async ({ browser }: { browser: Browser }, give: (page: Page) => Promise<void>) => {
				const ctx = await browser.newContext({ storageState: authStatePath(name) })
				await give(await ctx.newPage())
				await ctx.close()
			},
		]),
	) as unknown as PersonaFixtures,
)

// re-export just so imports for `test` and `expect` are consistent
export { expect } from '@playwright/test'
