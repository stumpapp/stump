import { Api, AuthUser, constants } from '@stump/sdk'
import { isAxiosError } from 'axios'
import { match, P } from 'ts-pattern'

import { ManagedToken, ServerConfig, ServerKind } from '~/stores/savedServer'

type AuthSDKParams = {
	config: ServerConfig | null
	existingToken?: ManagedToken | null
	saveToken?: (token: ManagedToken, forUser: AuthUser) => Promise<void>
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
	{ config, existingToken, saveToken }: AuthSDKParams,
): Promise<Api | null> => {
	if (existingToken) {
		instance.token = existingToken.token
	} else {
		instance.token = await match(config?.auth)
			.with({ bearer: P.string }, ({ bearer }) => bearer)
			.with(
				{
					basic: P.shape({
						username: P.string,
						password: P.string,
					}),
				},
				async ({ basic: { username, password } }) =>
					login(instance, { password, saveToken, username }),
			)
			.otherwise(() => undefined)
	}

	if (!instance.isAuthed) {
		return null
	}

	return instance
}

type LoginParams = {
	username: string
	password: string
} & Pick<AuthSDKParams, 'saveToken'>

const login = async (instance: Api, { username, password, saveToken }: LoginParams) => {
	try {
		const result = await instance.auth.login({ password, username })
		if ('forUser' in result) {
			const {
				token: { accessToken, expiresAt },
				forUser,
			} = result
			await saveToken?.(
				{
					expiresAt: new Date(expiresAt),
					token: accessToken,
				},
				forUser,
			)
			return accessToken
		}
	} catch (error) {
		const axiosError = isAxiosError(error) ? error : null
		const isNetworkError = axiosError?.code === 'ERR_NETWORK'
		if (isNetworkError) {
			throw error
		} else {
			console.warn('Failed to login:', error)
		}
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
			const api = new Api({ baseURL: url, authMethod: 'token', shouldFormatURL })
			api.token = token
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
