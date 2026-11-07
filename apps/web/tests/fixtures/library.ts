import { copyFileSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { Browser, Page } from '@playwright/test'

import { authStatePath } from '../users/personas'
import { executeGql } from './gql'

const REPO_FIXTURES = join(__dirname, '../../../..', 'packages', 'fixtures')

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
	/** a best-effort scan-and-wait for completion */
	waitForScan: () => Promise<void>
	/**
	 * deletes the library
	 */
	cleanup: () => Promise<void>
}

export async function createLibrary(browser: Browser, input: TestLibrary): Promise<LibraryFixture> {
	async function runAsCreator<T>(fn: (page: Page) => Promise<T>): Promise<T> {
		if (input.creatorPage) {
			return fn(input.creatorPage)
		}
		const ctx = await browser.newContext({ storageState: authStatePath('admin') })
		try {
			return await fn(await ctx.newPage())
		} finally {
			await ctx.close()
		}
	}

	const id = await runAsCreator(async (creatorPage) => {
		const data = await executeGql<{ libraries: { nodes: { id: string; name: string }[] } }>(
			creatorPage,
			`query E2EListLibraries {
				libraries(pagination: { none: { unpaginated: true } }) {
					nodes { id name }
				}
			}`,
		)
		const existing = data.libraries.nodes.find((l) => l.name === input.name)
		if (existing) {
			return existing.id
		}

		const contentDir = mkdtempSync(join(tmpdir(), `stump-e2e-library-${input.name}`))
		if (input.initWithBooks) {
			// TODO: support diff structures
			for (const file of BOOK_FILES) {
				copyFileSync(join(REPO_FIXTURES, file), join(contentDir, file))
			}
		}

		const created = await executeGql<{ createLibrary: { id: string } }>(
			creatorPage,
			`mutation E2ECreateLibrary($input: CreateOrUpdateLibraryInput!) {
				createLibrary(input: $input) { id }
			}`,
			{ input: { name: input.name, path: contentDir } },
		)
		return created.createLibrary.id
	})

	// this is really scuffed but frankly i don't want to build out a proper socket
	// sub for this right now that waits for the right event to come back. realistically
	// it should be fine because i will not be adding more than a few books which is
	// fractions of a sec
	async function waitForScan() {
		await runAsCreator(async (page) => {
			const data = await executeGql<{ scanLibrary: boolean }>(
				page,
				`mutation E2EScanLibrary($id: ID!) {
          scanLibrary(id: $id)
        }`,
				{ id },
			)
			if (!data.scanLibrary) {
				throw new Error(`Failed to trigger scan for library "${input.name}"`)
			}

			const maxWaitUntil = Date.now() + 30_000
			while (Date.now() < maxWaitUntil) {
				const data = await executeGql<{ libraryById: { lastScan: unknown } | null }>(
					page,
					`query E2ELibraryScanStatus($id: ID!) {
						libraryById(id: $id) { lastScan { timestamp } }
					}`,
					{ id },
				)
				if (data.libraryById?.lastScan) return
				await new Promise((resolve) => setTimeout(resolve, 500))
			}
			throw new Error(`Scan for library "${input.name}" did not finish in time`)
		})
	}

	async function cleanup() {
		await runAsCreator(async (page) => {
			await executeGql(
				page,
				`mutation E2EDeleteLibrary($id: ID!) {
          deleteLibrary(id: $id) { id }
        }`,
				{ id },
			)
		})
	}

	return { id, name: input.name, cleanup, waitForScan }
}
