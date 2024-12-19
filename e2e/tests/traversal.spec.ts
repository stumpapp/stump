import { expect, test } from '@playwright/test'

test.describe('Basic traversal', () => {
	test.use({ storageState: 'playwright/.auth/oromei.json' })

	test('Traverse library', async ({ page }) => {
		await page.goto('/')
		await expect(page).toHaveTitle(/Stump/)

		expect(await page.locator('[data-testid="libraryLink"]').count()).toBeGreaterThan(0)
		const firstLibrary = await page.locator('[data-testid="libraryLink"]').first()
		await firstLibrary.click()

		// We should be redirected to the library, wait for the URL to match /libraries/:id/.+
		// We start on /libraries/:id/series
		await page.waitForURL(/\/libraries\/[^/]+\/.+/)
		const libraryId = page.url().split('/')[4]
		expect(libraryId).toBeDefined()
		expect(libraryId).not.toEqual('create')

		// There should be a navigation bar: series, books, files, settings (prefix with libraryNavigation- for the data-testid)
		for (const tab of ['series', 'books', 'files', 'settings']) {
			expect(await page.locator(`[data-testid="libraryNavigation-${tab}"]`)).toBeVisible()
		}

		// We start on the series tab by default
		await page.waitForSelector('[data-testid="seriesCard"]')
		const seriesCount = await page.locator('[data-testid="seriesCard"]').count()
		expect(seriesCount).toEqual(3)

		// Switch to the books tab
		await page.locator('[data-testid="libraryNavigation-books"]').click()
		await page.waitForSelector('[data-testid="bookCard"]')
		const bookCount = await page.locator('[data-testid="bookCard"]').count()
		expect(bookCount).toEqual(3)

		// Switch to the files tab
		await page.locator('[data-testid="libraryNavigation-files"]').click()
		await page.waitForSelector('[data-testid="fileItem"]')

		// Switch to the settings tab
		await page.locator('[data-testid="libraryNavigation-settings"]').click()

		await page.waitForSelector('[data-testid="librarySettingsLink"]')
		const settingsCount = await page.locator('[data-testid="librarySettingsLink"]').count()
		expect(settingsCount).toEqual(7)
	})
})
