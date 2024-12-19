import { expect, test as setup } from '@playwright/test'

const DATA_DIR = (process.env._DATA_DIR as string) || '/tmp/stump-ci-data'

setup.use({ storageState: 'playwright/.auth/oromei.json' })

// TODO: separate setups for two different libraries

setup('initialize library', async ({ page }) => {
	await page.goto('/')

	// Create the library used for the tests
	await page.click('[data-testid="createLibraryLink"]')
	await page.fill('input[name="name"]', 'Test Library')
	await page.fill('input[name="path"]', DATA_DIR)

	await page.click('text=Next step')
	// We can skip the next 2 steps for now
	await page.click('text=Next step')
	await page.click('text=Continue to review')

	// Confirm the library creation
	await page.click('[data-testid="createLibraryButton"]')

	// We should be redirected to the library
	// Wait for the URL to match /libraries/:id, but NOT /libraries/create
	// I.e. a regex that matches /libraries/ followed by anything but create
	await page.waitForURL(/\/libraries\/(?!create)/)

	// We should see at least one series, look for data-testid="seriesCard"
	// Allow up to 10 seconds, refresh the page each second. This isn't ideal, but
	// waiting for a scan to complete is really involved.
	for (let i = 0; i < 10; i++) {
		const seriesCount = await page.$$eval('[data-testid="seriesCard"]', (series) => series.length)
		if (seriesCount > 0) {
			break
		}

		await page.reload()
		await page.waitForTimeout(1000)
	}

	const seriesCount = await page.$$eval('[data-testid="seriesCard"]', (series) => series.length)
	expect(seriesCount).toEqual(3)
})
