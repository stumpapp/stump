import { UserPermission } from '@stump/graphql'

export type Persona = {
	username: string
	password: string
	permissions: UserPermission[]
}

export const API_URL = process.env.STUMP_BASE_URL ?? 'http://localhost:10801'

export const personas = {
	// TODO(permissions): this will be the server owner but once improved permissioning is merged
	// it will just be controled via permissions
	admin: {
		username: 'oromei',
		password: 'oromei',
		// TODO(permissions): give permissions
		permissions: [],
	},
	moderator: {
		username: 'moderator',
		password: 'moderator',
		permissions: [UserPermission.ManageUsers, UserPermission.ReadUsers],
	},
} satisfies Record<string, Persona>

export type PersonaName = keyof typeof personas

/**
 * the path for the auth state of a given persona, which playwright re-uses for persistent auth
 */
export const authStatePath = (persona: PersonaName) => `playwright/.auth/${persona}.json`
