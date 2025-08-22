import { FORBIDDEN_ENTITY_NAMES } from '@stump/browser/utils'
import { z } from 'zod'

import { SavedServer } from '../../stores/savedServer'

/**
 * A function to build a schema for creating or editing a saved server
 *
 * @param existingServers The list of existing servers to check for duplicates
 * @param t The translation function
 * @param forServer The existing server to edit, if editing
 */
export const buildSchema = (
	existingServers: SavedServer[],
	t: (key: string) => string,
	forServer?: SavedServer,
) => {
	// If we are editing a server, we want to exclude it from the list of existing servers to prevent
	// a false positive when checking for duplicates in the list
	const adjustedExistingServers = forServer
		? existingServers.filter((server) => server.name !== forServer.name)
		: existingServers

	return z.object({
		name: z
			.string()
			.min(1)
			.refine((value) => !adjustedExistingServers.some((server) => server.name === value), {
				message: t(getKey('nameExists')),
			})
			.refine((value) => !FORBIDDEN_ENTITY_NAMES.includes(value), {
				message: t(getKey('nameForbidden')),
			}),
		url: z
			.string()
			// .url()
			.refine((value) => !adjustedExistingServers.some((server) => server.url === value), {
				message: t(getKey('urlExists')),
			}),
		isDefault: z.boolean().default(false),
		authMode: z
			.union([z.literal('token'), z.literal('basic'), z.literal('login')])
			.default('login'),
		token: z.string().optional(),
		username: z.string().optional(),
		password: z.string().optional(),
	})
}
export type CreateOrUpdateServerSchema = z.infer<ReturnType<typeof buildSchema>>

const LOCALE_KEY = 'settingsScene.app/desktop.sections.configuredServers.addServer.validation'
const getKey = (key: string) => `${LOCALE_KEY}.${key}`
