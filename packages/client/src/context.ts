import { AuthenticationMethod, AuthUser, JwtTokenPair } from '@stump/sdk'
import { QueryClient } from '@tanstack/react-query'
import { createContext, useContext } from 'react'

import { ServerConfig } from './desktop'

// TODO: Not sure I need this...?
export const QueryClientContext = createContext<QueryClient | undefined>(undefined)

export type CredentialStoreTokenState = Record<string, boolean>

export type IStumpClientContext = {
	onRedirect?: (url: string) => void
	onUnauthenticatedResponse?: (redirectUrl?: string, data?: unknown) => void
	onConnectionWithServerChanged?: (isConnected: boolean) => void
	onAuthenticated?: (user: AuthUser, token?: JwtTokenPair) => Promise<void>
	onLogout?: () => Promise<void>
	tauriRPC?: TauriRPC
}

type StoredTokens =
	| {
			apiKey: string
	  }
	| {
			jwt: {
				accessToken: string
				expiresAt: string
				refreshToken?: string | null | undefined
			}
	  }

export type StoredCredentials = NonNullable<Pick<ServerConfig, 'auth'>['auth']>

// TODO: If we fully isolate the desktop app then there is no need for this to live here
export type TauriRPC = {
	setDiscordPresence: (status?: string, details?: string) => Promise<void>
	/**
	 * Invoke the IPC command to set the use of Discord presence (on/off)
	 */
	setUseDiscordPresence: (connect: boolean) => Promise<void>
	/**
	 * Get the currently active server name. If none are active, or none exist, it will
	 * return null
	 */
	getCurrentServerName: () => Promise<string | null>
	/**
	 * Initialize the credential store
	 */
	initCredentialStore: (servers: string[]) => Promise<void>
	/**
	 * Get the current state of the credential store. This **will not** return actual
	 * tokens, but will return a record for which servers have tokens stored
	 */
	getStoreAuthState: () => Promise<Record<string, boolean>>
	/**
	 * Clear the credential store
	 */
	clearStore: () => Promise<void>

	getCredentials: (forServer: string) => Promise<StoredCredentials | null>
	setCredentials: (forServer: string, config: StoredCredentials) => Promise<ServerConfig>
	deleteCredentials: (forServer: string) => Promise<void>

	/**
	 * Get the API token for the given server
	 *
	 * @param forServer The server which the token was created by / to be used for
	 */
	getTokens: (forServer: string) => Promise<StoredTokens | null>
	/**
	 * Set the API token for the given server
	 *
	 * @param forServer The server which the token was created by / to be used for
	 * @param token The JWT token to store in the credential store
	 */
	setTokens: (forServer: string, tokens: StoredTokens) => Promise<void>
	/**
	 * Delete the API token for the given server
	 *
	 * @param forServer The server which the token was created by / to be used for
	 */
	deleteTokens: (forServer: string) => Promise<void>

	createServerEntry: (forServer: string) => Promise<void>
}

export const StumpClientContext = createContext<IStumpClientContext | undefined>(undefined)

// TODO: 'android' | 'ios' --> https://reactnative.dev/docs/platform
/**
 * The platform that the application is running on
 */
export type Platform = 'browser' | 'macOS' | 'windows' | 'linux' | 'mobile' | 'unknown'

/**
 * The props that are passed to the root of the application
 */
export type StumpClientProps = {
	authMethod?: AuthenticationMethod
	platform: Platform
	baseUrl?: string
	tauriRPC?: TauriRPC
} & Pick<IStumpClientContext, 'onAuthenticated' | 'onLogout' | 'onUnauthenticatedResponse'>

export const useClientContext = () => {
	const context = useContext(StumpClientContext)
	if (!context) {
		throw new Error('StumpContext not found')
	}
	return context
}
