import { z } from 'zod'

const LOCALE_BASE = 'addOrEditServer'
const getKey = (key: string) => `${LOCALE_BASE}.${key}`

export const createHeaderSchema = (t: (key: string) => string) =>
	z
		.object({
			key: z.string().nonempty(),
			value: z.string().nonempty(),
		})
		.refine((value) => value.key.toLowerCase() !== 'authorization', {
			message: t(getKey('validations.cannotSetAuthorizationHeader')),
		})

export const authMode = z.union([
	// i realized i needed a 'none' option for connections where auth is "not required"
	// from the perspective of the api instance, e.g. some servers (including stump) support
	// auth in the URL (like an api key part of the route path) and thus effectively there is
	// no auth flow (at least from the perspective of this client). the reason this was important
	// is because authless connections should still support some level of auto-sync (e.g., logos)
	z.literal('none'),
	z.literal('token'),
	z.literal('basic'),
	z.literal('login'),
])

export const createSchema = (names: string[], t: (key: string) => string) =>
	z.object({
		name: z
			.string()
			.nonempty()
			.min(1)
			.refine((value) => !names.includes(value), {
				message: t(getKey('validations.nameAlreadyExists')),
			}),
		url: z.string().url(),
		enableLocalProfile: z.boolean().default(false),
		localUrl: z.string().url().nullish(),
		localSsid: z.string().nullish(),
		kind: z
			.union([z.literal('stump'), z.literal('opds'), z.literal('opds-legacy')])
			.default('stump'),
		defaultServer: z.boolean().default(false),
		authMode: authMode.default('login'),
		token: z.string().optional(),
		basicUser: z.string().optional(),
		basicPassword: z.string().optional(),
		customHeaders: z.array(createHeaderSchema(t)).optional(),
	})
export type CreateOrUpdateServerData = z.infer<ReturnType<typeof createSchema>>

export const defaultCreateData = {
	defaultServer: false,
	kind: 'stump',
	name: '',
	url: '',
	enableLocalProfile: false,
	localUrl: '',
	localSsid: '',
	authMode: 'login',
	token: '',
	basicUser: '',
	basicPassword: '',
} satisfies CreateOrUpdateServerData
