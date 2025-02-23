import { Api, constants, User } from '@stump/sdk'
import { match, P } from 'ts-pattern'

import { ManagedToken, ServerConfig, ServerKind } from '~/stores/savedServer'

type AuthSDKParams = {
	config: ServerConfig | null
	existingToken?: ManagedToken | null
	saveToken?: (token: ManagedToken, forUser: User) => Promise<void>
}

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
		if ('for_user' in result) {
			const {
				token: { access_token, expires_at },
				for_user,
			} = result
			await saveToken?.(
				{
					expiresAt: new Date(expires_at),
					token: access_token,
				},
				for_user,
			)
			// return result as Exclude<typeof result, User>
			return access_token
		}
	} catch (error) {
		console.error(error)
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
