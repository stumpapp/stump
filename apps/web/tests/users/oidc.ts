import { type Browser, type Page } from '@playwright/test'

import { API_URL, executeGql } from '../fixtures/gql'
import { runAsAdmin } from './factory'

const OIDC_CONTROL_URL = 'http://localhost:9001'

type OidcClaims = {
	sub: string
	email: string
	name?: string
	groups: string[]
}

type OidcAuthUser = {
	id: string
	username: string
	permissions: string[]
}
// ^ just need a subset

export type CreatedOidcUser = OidcAuthUser & {
	oidcEmail: string
	page: Page
	loginWithClaims: (claims: OidcClaims) => Promise<OidcAuthUser>
	cleanup: () => Promise<void>
}

async function loginWithClaims(page: Page, claims: OidcClaims): Promise<OidcAuthUser> {
	const claimsResponse = await page.request.post(`${OIDC_CONTROL_URL}/set-claims`, {
		data: claims,
	})
	if (!claimsResponse.ok()) {
		throw new Error(`Failed to set OIDC claims: ${await claimsResponse.text()}`)
	}

	await page.goto(new URL('/api/v2/auth/oidc/authorize', API_URL).toString())
	const expectedUrl = new URL('/', API_URL).toString()
	if (page.url() !== expectedUrl) {
		throw new Error(`OIDC login redirected to ${page.url()} instead of ${expectedUrl}`)
	}

	const meResponse = await page.request.get(new URL('/api/v2/auth/me', API_URL).toString())
	if (!meResponse.ok()) {
		throw new Error(
			`OIDC login failed to create an authenticated session: ${await meResponse.text()}`,
		)
	}
	return (await meResponse.json()) as OidcAuthUser
}

/**
 * logs in via oidc config and returns the authed user, their session, and a cleanup fn
 * to delete them once done
 **/
export async function oidcLogin(browser: Browser, claims: OidcClaims): Promise<CreatedOidcUser> {
	const context = await browser.newContext()
	const page = await context.newPage()
	let user: OidcAuthUser
	try {
		user = await loginWithClaims(page, claims)
	} catch (error) {
		await context.close()
		throw error
	}

	async function cleanup() {
		try {
			await runAsAdmin(browser, async (adminPage) => {
				await executeGql(
					adminPage,
					`mutation E2EDeleteUser($id: ID!) { deleteUser(id: $id, hardDelete: true) { id } }`,
					{ id: user.id },
				)
			})
		} finally {
			await context.close()
		}
	}

	return {
		...user,
		oidcEmail: claims.email,
		page,
		loginWithClaims: (updatedClaims) => loginWithClaims(page, updatedClaims),
		cleanup,
	}
}
