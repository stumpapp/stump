import { expect, test as setup } from '@playwright/test'

const DATA_DIR = (process.env._DATA_DIR as string) || '/tmp/stump-ci-data'

setup.use({ storageState: 'playwright/.auth/oromei.json' })

// TODO: separate setups for two different librarie
setup('initialize library', async ({ page }) => {
	await page.goto('/')

	// Create the library used for the tests
	await page.click('[data-testid="createLibraryButton"]')
	await page.fill('input[name="name"]', 'Test Library')
	await page.fill('input[name="path"]', DATA_DIR)

	await page.click('text=Next step')
	// We can skip the next 2 steps for now
	await page.click('text=Next step')
	await page.click('text=Continue to review')

	// Confirm the library creation
	await page.click('text=Create library')

	// We should be redirected to the library
	await page.waitForURL(/\/libraries\/.+?$/)
})
