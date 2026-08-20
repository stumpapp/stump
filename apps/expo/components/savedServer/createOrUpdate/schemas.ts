import { match, P } from 'ts-pattern'
import { z } from 'zod'

import {
	CreateServer,
	NetworkProfile,
	SavedServerWithConfig,
	ServerConfig,
} from '~/stores/savedServer'

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

export function getUpdateServerDefaults(server?: SavedServerWithConfig | null) {
	if (!server) return defaultCreateData

	const authConfig = match(server.config?.auth)
		.with({ bearer: P.string }, (config) => ({
			authMode: 'token' as const,
			token: config.bearer,
			basicUser: '',
			basicPassword: '',
		}))
		.with(
			{
				basic: P.shape({
					username: P.string,
					password: P.string,
				}),
			},
			(config) => ({
				authMode: 'basic' as const,
				basicUser: config.basic.username,
				basicPassword: config.basic.password,
				token: '',
			}),
		)
		.otherwise((config) => ({
			authMode: config?.authless ? ('none' as const) : ('login' as const),
			basicUser: '',
			basicPassword: '',
			token: '',
		}))

	return {
		kind: server.kind,
		name: server.name,
		url: server.url,
		defaultServer: server.defaultServer ?? false,
		customHeaders: Object.entries(server.config?.customHeaders || {}).map(([key, value]) => ({
			key,
			value,
		})),
		enableLocalProfile: server.autoSwitchToLocal ?? false,
		localSsid: server.localProfile?.ssid,
		localUrl: server.localProfile?.url,
		...authConfig,
	} satisfies CreateOrUpdateServerData
}

export function intoCreateServer(data: CreateOrUpdateServerData) {
	const authConfig = match(data.authMode)
		.with('token', () => ({ bearer: data.token as string }))
		.with('basic', () => ({
			basic: { username: data.basicUser as string, password: data.basicPassword as string },
		}))
		.with('none', () => ({ authless: true }))
		.otherwise(() => undefined)
	const baseConfig = authConfig ? ({ auth: authConfig } satisfies ServerConfig) : undefined

	const config =
		!!data.customHeaders && data.customHeaders.length > 0
			? {
					...baseConfig,
					customHeaders: data.customHeaders.reduce(
						(acc, { key, value }) => ({
							...acc,
							[key]: value,
						}),
						{},
					),
				}
			: baseConfig

	const localProfile: NetworkProfile | undefined = data.localUrl
		? {
				url: data.localUrl,
				ssid: data.localSsid || null,
			}
		: undefined

	return {
		kind: data.kind,
		name: data.name,
		url: data.url,
		defaultServer: data.defaultServer,
		localProfile,
		autoSwitchToLocal: data.enableLocalProfile,
		config,
	} satisfies CreateServer
}
