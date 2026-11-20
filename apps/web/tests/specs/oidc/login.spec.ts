import { expect, test } from '@playwright/test'

import { API_URL } from '../../fixtures/gql'

test.skip(!process.env.STUMP_BASE_URL, 'requires a running Stump server with OIDC configured')

test('authenticates through the configured OIDC provider', async ({ page }) => {
	const claims = {
		sub: 'oromei-oidc',
		email: 'oromei-oidc@example.idk',
		groups: [],
	}

	const claimsResponse = await page.request.post('http://localhost:9001/set-claims', {
		data: claims,
	})
	expect(claimsResponse.ok(), await claimsResponse.text()).toBeTruthy()

	await page.goto('/api/v2/auth/oidc/authorize')
	await expect(page).toHaveURL(new URL('/', API_URL).toString())

	const meResponse = await page.request.get(new URL('/api/v2/auth/me', API_URL).toString())
	expect(meResponse.ok(), await meResponse.text()).toBeTruthy()
	expect((await meResponse.json()).username).toBe(claims.email)
})
