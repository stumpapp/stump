import { expect, request, test } from '@playwright/test'

// OPDS v1.2 is an XML feed
test.describe('OPDS v1.2', () => {
	test.use({ storageState: 'playwright/.auth/oromei.json' })

	test('catalog is accessible', async ({ page, browserName }) => {
		await page.goto('/opds/v1.2/catalog')

		// Firefox seems to have issue with using locators for XML content
		if (browserName === 'firefox') {
			const feedCount = await page.$$eval('feed', (feeds) => feeds.length)
			expect(feedCount).toBe(1)
		} else {
			await expect(page.locator('body')).toContainText(
				/<feed xmlns="http:\/\/www.w3.org\/2005\/Atom"/,
			)
		}
	})
})

// OPDS v2.0 is a JSON feed
test.describe('OPDS v2.0', () => {
	test.use({ storageState: 'playwright/.auth/oromei.json' })

	test('catalog is accessible', async ({ page }) => {
		await page.goto('/opds/v2.0/catalog')

		await expect(page.locator('body')).toContainText('links')
	})

	test('catalog is valid JSON', async ({ page }) => {
		await page.goto('/opds/v2.0/catalog')

		const url = await page.url()
		const requestContext = await request.newContext({
			storageState: 'playwright/.auth/oromei.json',
		})
		const response = await requestContext.get(url)

		expect(response.status()).toBe(200)

		const json = await response.json()
		// The major bits should all be present
		for (const key of ['links', 'navigation', 'groups', 'metadata']) {
			expect(json).toHaveProperty(key)
		}
	})
})
