import { expect, test } from '@playwright/test'

import { personas } from '../../users/personas'

test.describe('Login flow', () => {
	test('unauthenticated user is redirected to /auth', async ({ browser }) => {
		const ctx = await browser.newContext() // no stored session
		const page = await ctx.newPage()

		await page.goto('/settings/account')

		await expect(page).toHaveURL(/\/auth\?redirect/)

		await ctx.close()
	})

	test('after login, user lands back at the originally requested page', async ({ browser }) => {
		const ctx = await browser.newContext()
		const page = await ctx.newPage()

		await page.goto('/settings/account')
		await expect(page).toHaveURL(/\/auth\?redirect/)

		await page.getByLabel(/username/i).fill(personas.admin.username)
		await page.getByLabel(/password/i).fill(personas.admin.password)
		await page.getByTestId('loginOrRegisterButton').click()

		await expect(page).toHaveURL(/\/settings\/account/)

		await ctx.close()
	})
})
