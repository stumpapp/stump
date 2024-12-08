import { expect, test } from '@playwright/test'

test('it loads', async ({ page }) => {
	await page.goto('/')

	await expect(page).toHaveTitle(/Stump/)
})
