import { Api, AuthUser, constants } from '@stump/sdk'
import { isAxiosError } from 'axios'
import partition from 'lodash/partition'
import { match, P } from 'ts-pattern'

import { ManagedToken, SavedServerWithConfig, ServerConfig, ServerKind } from '~/stores/savedServer'

type AuthSDKParams = {
	config: ServerConfig | null
	existingToken?: ManagedToken | null
	saveToken?: (token: ManagedToken, forUser: AuthUser) => Promise<void>
	onAttemptingAutoAuth?: (attempting: boolean) => void
}

/**
 * Authenticate an SDK instance with the provided configuration and token information.
 *
 * @param instance A base instance of the SDK. This will be mutated with the auth token
 * @param params An object containing the configuration and token information
 *
 * @returns The instance of the SDK with the auth token set
 * @throws If the server is unreachable, a failed login attempt does not throw an error
 */
export const authSDKInstance = async (
	instance: Api,
	{ config, existingToken, saveToken, onAttemptingAutoAuth }: AuthSDKParams,
): Promise<Api | null> => {
	if (existingToken) {
		instance.tokens = existingToken
	} else {
		await match(config?.auth)
			.with({ bearer: P.string }, ({ bearer }) => {
				instance.staticToken = bearer
			})
			.with(
				{
					basic: P.shape({
						username: P.string,
						password: P.string,
					}),
				},
				async ({ basic: { username, password } }) => {
					onAttemptingAutoAuth?.(true)
					const tokens = await login(instance, {
						password,
						saveToken,
						username,
						onAttemptingAutoAuth,
					})
					instance.tokens = tokens
				},
			)
			.otherwise(() => {})
	}

	if (!instance.isAuthed) {
		return null
	}

	return instance
}

type LoginParams = {
	username: string
	password: string
} & Pick<AuthSDKParams, 'saveToken' | 'onAttemptingAutoAuth'>

const login = async (
	instance: Api,
	{ username, password, saveToken, onAttemptingAutoAuth }: LoginParams,
) => {
	try {
		const result = await instance.auth.login({ password, username })
		if ('forUser' in result) {
			const { forUser, ...token } = result
			await saveToken?.(token, forUser)
			return token
		}
	} catch (error) {
		const axiosError = isAxiosError(error) ? error : null
		const isNetworkError = axiosError?.code === 'ERR_NETWORK'
		if (isNetworkError) {
			throw error
		} else {
			console.warn('Failed to login:', error)
		}
	} finally {
		onAttemptingAutoAuth?.(false)
	}
}

type GetOPDSParams = {
	config: ServerConfig | null
	serverKind: ServerKind
	url: string
}

export const getOPDSInstance = async ({ config, serverKind, url }: GetOPDSParams): Promise<Api> => {
	const shouldFormatURL = serverKind === 'stump'

	const instance = match(config?.auth)
		.with(
			{ basic: P.shape({ username: P.string, password: P.string }) },
			({ basic: { username, password } }) => {
				const api = new Api({ baseURL: url, authMethod: 'basic', shouldFormatURL })
				api.basicAuth = { username, password }
				return api
			},
		)
		.with({ bearer: P.string }, ({ bearer: token }) => {
			const api = new Api({ baseURL: url, authMethod: 'api-key', shouldFormatURL })
			api.staticToken = token
			return api
		})
		.otherwise(() => new Api({ baseURL: url, authMethod: 'basic', shouldFormatURL }))

	const customHeaders = {
		...config?.customHeaders,
		...('basic' in (config?.auth || {})
			? {
					[constants.STUMP_SAVE_BASIC_SESSION_HEADER]: 'false',
				}
			: {}),
	}

	if (Object.keys(customHeaders).length) {
		instance.customHeaders = customHeaders
	}

	return instance
}

type GetInstancesForServersParams = {
	getServerToken: (id: string) => Promise<ManagedToken | null>
	saveToken: (id: string, token: ManagedToken) => Promise<void>
	getCachedInstance?: (id: string) => Api | undefined
	onCacheInstance?: (id: string, instance: Api) => void
}

export const getInstancesForServers = async (
	servers: SavedServerWithConfig[],
	{ getServerToken, saveToken, onCacheInstance, getCachedInstance }: GetInstancesForServersParams,
): Promise<Record<string, Api>> => {
	const [compatibleServers, incompatibleServers] = partition(
		servers,
		(server) =>
			server.kind === 'stump' &&
			match(server.config?.auth)
				.with({ basic: P.shape({ username: P.string, password: P.string }) }, () => true)
				.with({ bearer: P.string }, () => true)
				.otherwise(() => false),
	)

	if (incompatibleServers.length > 0) {
		console.warn(`Found ${incompatibleServers.length} incompatible servers for progress sync`)
	}

	if (compatibleServers.length === 0) {
		console.warn('No compatible servers found for progress sync')
		return {}
	}

	const instances: Record<string, Api> = {}

	const getInstanceForServer = async (server: SavedServerWithConfig) => {
		const storedToken = await getServerToken(server.id)
		const authMethod = match(server.config?.auth)
			.with({ bearer: P.string }, () => 'api-key' as const)
			.otherwise(() => 'token' as const)

		const cachedInstance = onCacheInstance ? getCachedInstance?.(server.id) : undefined

		const instance =
			cachedInstance ??
			new Api({
				baseURL: server.url,
				authMethod,
				customHeaders: server.config?.customHeaders,
			})

		instance.tokens = storedToken || undefined
		const existingToken = await instance.getOrRefreshTokens()

		try {
			const authedInstance = await authSDKInstance(instance, {
				config: server.config,
				existingToken,
				saveToken: async (token) => {
					if (token) {
						await saveToken(server.id, token)
					}
				},
			})

			if (authedInstance) {
				onCacheInstance?.(server.id, authedInstance)
				instances[server.id] = authedInstance
			} else {
				console.warn(`Failed to authenticate server ${server.name} for progress sync`)
			}
		} catch (error) {
			console.error(`Failed to authenticate server ${server.name}:`, error)
		}
	}

	await Promise.all(compatibleServers.map((server) => getInstanceForServer(server)))

	return instances
}
