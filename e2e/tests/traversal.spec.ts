import { expect, test } from '@playwright/test'

test.describe('Web app basic usage', () => {
	test.use({ storageState: 'playwright/.auth/oromei.json' })

	test('User can change preferences', async ({ page }) => {
		await page.goto('/')
		await expect(page).toHaveTitle(/Stump/)

		await page.click('[data-testid="settingsButton"]')
		await expect(page).toHaveURL(/\/settings\/app\/account$/)

		await page.click('text=Appearance')
		await expect(page).toHaveURL(/\/settings\/app\/appearance$/)
		await page.selectOption('[data-testid="themeSelect"]', { value: 'dark' })
	})
})

test.use({ storageState: 'playwright/.auth/oromei.json' })
test('OPDS is accessible', async ({ page }) => {
	await page.goto('/opds/v1.2/catalog')
	await expect(page.locator('body')).toContainText(/<feed xmlns="http:\/\/www.w3.org\/2005\/Atom"/)
	// TODO: test the feed content?
})
