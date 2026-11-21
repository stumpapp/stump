import { UserPermission } from '@stump/graphql'

// TODO: add age restrictions
export type TestUser = {
	username: string
	password: string
	permissions: UserPermission[]
}

/**
 * a collection of persistent users who will be created as part of setup during e2e runs.
 * these users are not meant to be ephemeral, but represent a more common set of users that can
 * be broadly applied to many tests.
 *
 * for more ephemeral users, you can create users more dynamically via the factory.ts exports
 */
export const personas = {
	admin: {
		username: 'oromei',
		password: 'oromei',
		permissions: [UserPermission.ManageServer],
	},
	reader: {
		username: 'reader',
		password: 'reader',
		permissions: [],
	},
	librarian: {
		username: 'librarian',
		password: 'librarian',
		permissions: [UserPermission.ManageLibrary, UserPermission.ReadUsers],
	},
} satisfies Record<string, TestUser>

export type Persona = keyof typeof personas

export const persona = (key: Persona) => personas[key]

/**
 * the path for the auth state of a given username, which playwright re-uses for persistent auth
 */
export const authStatePath = (username: string) => `playwright/.auth/${username}.json`
