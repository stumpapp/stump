import { expect, test as setup } from '@playwright/test'

setup('initialize server owner', async ({ page }) => {
	await page.goto('/')

	// We should have been redirected to /auth (starts with /auth, might have params)
	expect(await page.url()).toMatch(/\/auth/)

	// We should be using a fresh DB
	expect(await page.textContent('text=Initialize your server')).toBeTruthy()

	// Create the server owner
	await page.fill('input[name="username"]', 'oromei')
	await page.fill('input[name="password"]', 'oromei')
	await page.click('button[type="submit"]')

	await page.waitForURL(/\/$/)
})

const oromeiStorage = 'playwright/.auth/oromei.json'
setup('authenticate as oromei', async ({ page }) => {
	await page.goto('/')
	expect(await page.url()).toMatch(/\/auth/)

	await page.fill('input[name="username"]', 'oromei')
	await page.fill('input[name="password"]', 'oromei')
	await page.click('button[type="submit"]')

	await page.waitForURL(/\/$/) // Wait until the page receives the cookies.

	// End of authentication steps.
	await page.context().storageState({ path: oromeiStorage })
})
