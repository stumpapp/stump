import { Browser, expect } from '@playwright/test'
import { UserPermission } from '@stump/graphql/index'

import { test } from '../../fixtures'
import { executeGql } from '../../fixtures/gql'
import { createLibrary, LibraryFixture } from '../../fixtures/library'
import { createTestUser, getUserId, runAsAdmin } from '../../users/factory'
import { type Persona, persona } from '../../users/personas'

const LIBRARY_NAME = 'Access Control Library'

test.describe.configure({ mode: 'serial' })
// ^ these tests mutate access state on a shared library so must run serially

let library: LibraryFixture

test.beforeAll(async ({ browser }) => {
	library = await createLibrary(browser, { name: LIBRARY_NAME, initWithBooks: true })
	const librarianId = await runAsAdmin(browser, (page) =>
		getUserId(page, persona('librarian').username),
	)
	await grantAccessToLibrary(browser, [librarianId])
})

test.afterAll(async ({ browser }) => {
	await grantAccessToLibrary(browser, [])
})

async function grantAccessToLibrary(browser: Browser, userIds: string[]) {
	await runAsAdmin(browser, async (page) => {
		const adminId = await getUserId(page, persona('admin').username)
		const librarianId = await getUserId(page, persona('librarian').username)
		await executeGql(
			page,
			`mutation E2EGrantAccess($id: ID!, $userIds: [String!]!) {
				updateLibraryAccess(id: $id, userIds: $userIds) {
					id
				}
			}`,
			{ id: library.id, userIds: [...new Set([adminId, librarianId, ...userIds])] },
			// ^ ensure we keep admin access and librarian access
		)
	})
}

test.describe('library visibility', () => {
	test('a user without access should not see the library', async ({ readerPage }) => {
		await readerPage.goto('/libraries')
		await expect(readerPage.getByTestId(`collection-grid-item-${LIBRARY_NAME}`)).toHaveCount(0)
		await readerPage.goto(`/libraries/${library.id}`)
		await expect(readerPage).toHaveURL(/\/404$/) // no access = redirect for direct access
	})

	test('a user with access should see the library and access it', async ({
		readerPage,
		browser,
	}) => {
		const readerId = await runAsAdmin(browser, (page) =>
			getUserId(page, persona('reader').username),
		)
		await grantAccessToLibrary(browser, [readerId])

		await readerPage.goto('/libraries')
		await expect(readerPage.getByTestId(`collection-grid-item-${LIBRARY_NAME}`)).toHaveCount(1)
		await readerPage.goto(`/libraries/${library.id}`)
		await expect(readerPage).toHaveURL(`/libraries/${library.id}`)
	})

	test('revoking access should immediately make the library inaccessible', async ({
		readerPage,
		browser,
	}) => {
		const readerId = await runAsAdmin(browser, (page) =>
			getUserId(page, persona('reader').username),
		)
		await grantAccessToLibrary(browser, [readerId])

		await readerPage.goto(`/libraries/${library.id}`)
		await expect(readerPage).toHaveURL(`/libraries/${library.id}`)

		await grantAccessToLibrary(browser, [])
		// ^ omit = revoke, so after refresh it should be inaccessible

		await readerPage.reload()
		await expect(readerPage).toHaveURL(/\/404$/)
	})
})

test.describe('library access management', () => {
	test('a user with management access but without user read perms cannot see the access control page', async ({
		browser,
	}) => {
		const user = await createTestUser(browser, {
			username: 'librarianNoReadUsers',
			password: 'password',
			permissions: [UserPermission.ManageLibrary],
		})
		await grantAccessToLibrary(browser, [user.id])
		// ^ otherwise cannot access the lib ofc
		await user.page.goto(`/libraries/${library.id}/settings/access-control`)
		await expect(user.page).toHaveURL(`/libraries/${library.id}/settings/basics`)
		// ^ auto-redirects instead of 404ing
		await user.cleanup()
	})

	test('a user with management access can see who has access and who does not', async ({
		librarianPage,
	}) => {
		await librarianPage.goto(`/libraries/${library.id}/settings/access-control`)

		const badge = (key: Persona, state: 'granted' | 'not-granted') =>
			librarianPage.getByTestId(`library-access-badge-${persona(key).username}-${state}`)

		await expect(badge('admin', 'granted')).toHaveCount(1)
		await expect(badge('librarian', 'granted')).toHaveCount(1)
		await expect(badge('reader', 'not-granted')).toHaveCount(1)
	})

	test('a user with management access cannot affect their own access', async ({
		librarianPage,
	}) => {
		await librarianPage.goto(`/libraries/${library.id}/settings/access-control`)
		await expect(
			librarianPage.getByTestId(`library-access-checkbox-${persona('librarian').username}`),
		).toBeDisabled()
		await expect(librarianPage.getByTestId('library-access-revoke-selected-button')).toBeDisabled()
		await expect(librarianPage.getByTestId('library-access-grant-selected-button')).toBeDisabled()
	})

	test('a user with management access can grant and revoke access for other users', async ({
		librarianPage,
	}) => {
		await librarianPage.goto(`/libraries/${library.id}/settings/access-control`)
		await expect(
			librarianPage.getByTestId(`library-access-checkbox-${persona('reader').username}`),
		).toBeVisible()

		await librarianPage.getByTestId(`library-access-checkbox-${persona('reader').username}`).check()
		await librarianPage.getByTestId('library-access-grant-selected-button').click()
		await expect(librarianPage.getByTestId(`library-access-badge-reader-granted`)).toHaveCount(1)

		await expect(
			librarianPage.getByTestId(`library-access-checkbox-${persona('reader').username}`),
		).not.toBeChecked()
		await librarianPage.getByTestId(`library-access-checkbox-${persona('reader').username}`).check()
		await librarianPage.getByTestId('library-access-revoke-selected-button').click()
		await expect(librarianPage.getByTestId(`library-access-badge-reader-not-granted`)).toHaveCount(
			1,
		)
	})

	test('granting access to multiple users at once works', async ({ browser, librarianPage }) => {
		// let's ensure that reader has access, and create a new user without access:
		const readerId = await runAsAdmin(browser, (page) =>
			getUserId(page, persona('reader').username),
		)
		await grantAccessToLibrary(browser, [readerId])

		const user = await createTestUser(browser, {
			username: 'anotherUser',
			password: 'anotherUser',
			permissions: [],
		})

		await librarianPage.goto(`/libraries/${library.id}/settings/access-control`)
		await expect(
			librarianPage.getByTestId(`library-access-checkbox-${persona('reader').username}`),
		).toBeVisible()
		await expect(
			librarianPage.getByTestId(`library-access-checkbox-${user.username}`),
		).toBeVisible()

		// no selection = both buttons are disabled
		await expect(librarianPage.getByTestId('library-access-revoke-selected-button')).toBeDisabled()
		await expect(librarianPage.getByTestId('library-access-grant-selected-button')).toBeDisabled()

		await librarianPage.getByTestId(`library-access-checkbox-${persona('reader').username}`).check()
		// a user with access checked = the revoke button becomes enabled
		await expect(librarianPage.getByTestId('library-access-revoke-selected-button')).toBeEnabled()
		await expect(librarianPage.getByTestId('library-access-grant-selected-button')).toBeDisabled()

		await librarianPage.getByTestId(`library-access-checkbox-${user.username}`).check()
		// a user without access checked = the grant button becomes enabled, so both enabled
		await expect(librarianPage.getByTestId('library-access-revoke-selected-button')).toBeEnabled()
		await expect(librarianPage.getByTestId('library-access-grant-selected-button')).toBeEnabled()

		await librarianPage.getByTestId('library-access-grant-selected-button').click()

		await expect(librarianPage.getByTestId(`library-access-badge-reader-granted`)).toHaveCount(1)
		await expect(
			librarianPage.getByTestId(`library-access-badge-${user.username}-granted`),
		).toHaveCount(1)

		await user.cleanup()
	})
})
