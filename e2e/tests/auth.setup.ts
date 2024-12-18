import { expect, test as setup } from '@playwright/test'

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

// const userFile = 'playwright/.auth/user.json';
// setup('authenticate as user', async ({ page }) => {
//   // Perform authentication steps. Replace these actions with your own.
//   await page.goto('https://github.com/login');
//   await page.getByLabel('Username or email address').fill('user');
//   await page.getByLabel('Password').fill('password');
//   await page.getByRole('button', { name: 'Sign in' }).click();
//   // Wait until the page receives the cookies.
//   //
//   // Sometimes login flow sets cookies in the process of several redirects.
//   // Wait for the final URL to ensure that the cookies are actually set.
//   await page.waitForURL('https://github.com/');
//   // Alternatively, you can wait until the page reaches a state where all cookies are set.
//   await expect(page.getByRole('button', { name: 'View profile and more' })).toBeVisible();

//   // End of authentication steps.

//   await page.context().storageState({ path: userFile });
// });
