import { UserPermission } from '@stump/graphql'

import { expect, test } from '../../../fixtures'
import { type CreatedEphemeralUser, createTestUser } from '../../../users/factory'

// TODO: my gut reaction to https://github.com/stumpapp/stump/issues/1341
// was that e2e tests would have caught this issue, and more generally have
// been wanting to add more browser-specific e2e suites for better future
// stability with stump. so this preamble to say, i think this was a valid
// path to take overall but probably an overreaction to this specific bug.
// this could have easily been caught with unit tests at the router/component
// level to assert given X permission we render Y. so lol i think i might
// convert this to unit tests, then add a suite for something that really lends
// itself to e2e. i'll also need to add some guidance to contributing docs (or just
// in the readme here?) to help folks know whether contributions need either (or both)
// flavors of tests

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
