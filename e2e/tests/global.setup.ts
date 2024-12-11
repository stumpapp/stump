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

// setup('initialize child account', async ({ page }) => {
// 	await page.goto('/')

// 	// Go to settings
// 	await page.click('[data-testid="settingsButton"]')
// 	expect(await page.url()).toMatch(/\/settings\/.+?$/)

// 	// Go to users
// 	await page.click('text=Users')
// 	expect(await page.url()).toMatch(/\/settings\/server\/users$/)

// 	// Click "Create user"
// 	await page.click('text=Create user')

// 	// URL should be /settings/server/users/create
// 	expect(await page.url()).toMatch(/\/settings\/server\/users\/create$/)

// 	// Fill out the form: child+child for username and password
// 	await page.fill('input[name="username"]', 'child')
// 	await page.fill('input[name="password"]', 'child')

// 	// Input with ID age_restriction, write 13
// 	await page.fill('input#age_restriction', '13')
// })

// setup('initialize ebook library', async ({ page }) => {
// 	await page.goto('/')
// })

// setup('initialize comics library', async ({ page }) => {
// 	await page.goto('/')
// })
