// TODO: writing out the tests i want first knowing i have to build out some fixtures
// and supporting code first:
//
// 1. a user with no access to a library should not see the library in the ui
// 2. a user with access to a library should see the library in the ui
// 3. a user that has access revoked should immediately lose access to library
//    ^ kinda more in the category of management section i outline below
// 4. direct urls should not work for a user without access to a library, e.g. if i snag a url of a specific book or reader etc
// 5. an admin is not exempt from access control, e.g. MANAGE_SERVER still adheres to library_access
//
// i think there is an argument to be made that more management ops can be in a separate spec? idk, organization
// aside i would want to test:
//
// 1. a user with management access can see the access records (who does/does not have access)
//    ^ if also have user read perms ofc
// 2. a user without ^ cannot
// 3. a user with management access cannot affect their own access
// 4. ensure that selections are a full replacement, e.g. if two users are selected with diff
//    access then they both get assigned whichever i choose (no access or access)

import { Browser, expect } from '@playwright/test'

import { test } from '../../fixtures'
import { executeGql } from '../../fixtures/gql'
import { createLibrary, LibraryFixture } from '../../fixtures/library'
import { getUserId, runAsAdmin } from '../../users/factory'
import { persona } from '../../users/personas'

const LIBRARY_NAME = 'Access Control Library'

test.describe.configure({ mode: 'serial' })
// ^ these tests mutate access state on a shared library so must run serially

let library: LibraryFixture

test.beforeAll(async ({ browser }) => {
	library = await createLibrary(browser, { name: LIBRARY_NAME, initWithBooks: true })
})

async function grantAccessToLibrary(browser: Browser, userIds: string[]) {
	await runAsAdmin(browser, async (page) => {
		const adminId = await getUserId(page, persona('admin').username)
		await executeGql(
			page,
			`mutation E2EGrantAccess($id: ID!, $userIds: [String!]!) {
				updateLibraryAccess(id: $id, userIds: $userIds) {
					id
				}
			}`,
			{ id: library.id, userIds: [...new Set([adminId, ...userIds])] },
			// ^ ensure we keep admin access
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
