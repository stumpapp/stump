import { UserPermission } from '@stump/graphql'

import { expect, test } from '../../../fixtures'
import { type CreatedEphemeralUser, createTestUser } from '../../../users/factory'

test.describe.serial('Settings / Users', () => {
	let readUsers: CreatedEphemeralUser

	test.beforeAll(async ({ browser }) => {
		readUsers = await createTestUser(browser, {
			username: 'read-users',
			password: 'read-users',
			permissions: [UserPermission.ReadUsers],
		})
	})

	test.afterAll(async () => {
		await readUsers.cleanup()
	})

	test('admin user can open the page and see all sections', async ({ adminPage: page }) => {
		await page.goto('/settings/users')

		await expect(page.getByRole('table')).toBeVisible()
		await expect(page.getByTestId('users-stats')).toBeVisible()
		await expect(page.getByTestId('login-activity-section')).toBeVisible()
	})

	test('non-admin user can only see relevant sections per their permissions ', async () => {
		const page = readUsers.page

		await page.goto('/settings/users')

		await expect(page.getByRole('table')).toBeVisible() // seen = no error = yay

		await expect(page.getByTestId('users-stats')).not.toBeVisible()
		await expect(page.getByTestId('login-activity-section')).not.toBeVisible()
		// we should assert the ^ above is not because of an error but becuase permissions properly
		// being respected
		await expect(page.getByTestId('error-fallback')).not.toBeVisible()
	})
})
