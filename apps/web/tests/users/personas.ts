import { UserPermission } from '@stump/graphql'

// TODO: add age restrictions
export type Persona = {
	username: string
	password: string
	permissions: UserPermission[]
}

export const API_URL = process.env.STUMP_BASE_URL ?? 'http://localhost:10801'

/**
 * a collection of persistent users who will be created as part of setup during e2e runs.
 * these users are not meant to be ephemeral, but represent a more common set of users that can
 * be broadly applied to many tests.
 *
 * for more ephemeral users, you can create users more dynamically via the factory.ts exports
 */
export const personas = {
	// TODO(permissions): this will be the server owner but once improved permissioning is merged
	// it will just be controled via permissions
	admin: {
		username: 'oromei',
		password: 'oromei',
		// TODO(permissions): give permissions
		permissions: [],
	},
} satisfies Record<string, Persona>

export type PersonaName = keyof typeof personas

/**
 * the path for the auth state of a given persona, which playwright re-uses for persistent auth
 */
export const authStatePath = (persona: PersonaName) => `playwright/.auth/${persona}.json`
