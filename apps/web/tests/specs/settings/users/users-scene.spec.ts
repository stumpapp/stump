import { expect, test } from '../../../fixtures'

test.describe('Settings / Users', () => {
	test('admin user can open the page and see all sections', async ({ adminPage: page }) => {
		await page.goto('/settings/users')

		await expect(page.getByRole('table')).toBeVisible()
		await expect(page.getByTestId('users-stats')).toBeVisible()
		await expect(page.getByTestId('login-activity-section')).toBeVisible()
	})

	test('non-admin user can only see relevant sections per their permissions ', async ({
		moderatorPage: page,
	}) => {
		await page.goto('/settings/users')

		await expect(page.getByRole('table')).toBeVisible() // seen = no error = yay

		// TODO(permissions): consider whether moderator persona gets stats
		await expect(page.getByTestId('users-stats')).not.toBeVisible()
		await expect(page.getByTestId('login-activity-section')).not.toBeVisible()
		// we should assert the ^ above is not because of an error but becuase permissions properly
		// being respected
		await expect(page.getByTestId('error-fallback')).not.toBeVisible()
	})
})
