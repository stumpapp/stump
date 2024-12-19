import { expect, test } from '@playwright/test'

test.describe('User settings', () => {
	test.use({ storageState: 'playwright/.auth/oromei.json' })

	test('Can change preferences', async ({ page }) => {
		await page.goto('/')
		await expect(page).toHaveTitle(/Stump/)

		await page.click('[data-testid="settingsButton"]')
		await expect(page).toHaveURL(/\/settings\/app\/account$/)

		await page.click('text=Appearance')
		await expect(page).toHaveURL(/\/settings\/app\/appearance$/)
		await page.selectOption('[data-testid="themeSelect"]', { value: 'dark' })
	})
})
