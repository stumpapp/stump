import { fileURLToPath } from 'node:url'

import { Page } from '@playwright/test'

const REPO_FIXTURES = fileURLToPath(new URL('../../../../packages/fixtures/', import.meta.url))

const BOOK_FILES = ['book.epub', 'science_comics_001.cbz']

// TODO: keep here? move to libraries/factory or something like users?
// i imagine a few options to curate:
// - books
// - comics
// - mixed
// ^ eventually adding more as i build out more content-aware ui presentation stuff
// const libraryTemplates = {
// 	comics: {
// 		name: 'Comics',
// 	},
// }

export type TestLibrary = {
	name: string
	initWithBooks?: boolean
	// ^ not all tests really require content so no need to waste compute,
	// e.g., access control
	/**
	 * the page for the user who creates the library, otherwise defaulting to
	 * the admin account
	 */
	creatorPage?: Page
}

export type LibraryFixture = {
	id: string
	name: string

	// waitForScan: () => Promise<void>
	// TODO: ^ unsure exactly how, i can just to a naive best-effort wait, i mean a few
	// books wouldn't take more than a couple ms but i could also kick off a sub
	// and wait for the event (but worrrrrkkk)

	/**
	 * deletes the library
	 */
	cleanup: () => Promise<void>
}
