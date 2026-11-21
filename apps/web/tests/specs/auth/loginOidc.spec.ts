import { expect, test } from '@playwright/test'

import { oidcLogin } from '../../users/oidc'

test.skip(!process.env.STUMP_BASE_URL, 'requires a running Stump server with OIDC configured')

test.describe('OIDC login', () => {
	test.describe.configure({ mode: 'serial' })

	test('assigns permissions from an OIDC group mapping', async ({ browser }) => {
		const claims = {
			sub: 'oromei',
			email: 'oromei@example.cloud',
			groups: ['admins'],
		}

		const user = await oidcLogin(browser, claims)
		try {
			expect(user.username).toBe(claims.email)
			expect(user.permissions).toContain('MANAGE_SERVER')
		} finally {
			await user.cleanup()
		}
	})

	test('removes mapped permissions when a user loses their previous group', async ({ browser }) => {
		const claims = {
			sub: 'oromei',
			email: 'oromei@example.cloud',
			groups: ['admins'],
		}

		const user = await oidcLogin(browser, claims)
		try {
			expect(user.permissions).toContain('MANAGE_SERVER')

			const returningLogin = await user.loginWithClaims({ ...claims, groups: [] })
			expect(returningLogin.permissions).not.toContain('MANAGE_SERVER')
		} finally {
			await user.cleanup()
		}
	})
})
