import { AuthenticationMethod, AuthUser, JwtTokenPair } from '@stump/sdk'
import { QueryClient } from '@tanstack/react-query'
import { createContext, useContext } from 'react'

export const QueryClientContext = createContext<QueryClient | undefined>(undefined)

export type IStumpClientContext = {
	onRedirect?: (url: string) => void
	onUnauthenticatedResponse?: (redirectUrl?: string, data?: unknown) => void
	onConnectionWithServerChanged?: (isConnected: boolean) => void
	onAuthenticated?: (user: AuthUser, token?: JwtTokenPair) => Promise<void>
	onLogout?: () => Promise<void>
	tauriRPC?: TauriRPC
}

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
	initCredentialStore: () => Promise<void>
	/**
	 * Get the current state of the credential store. This **will not** return actual
	 * tokens, but will return a record for which servers have tokens stored
	 */
	getCredentialStoreState: () => Promise<Record<string, boolean>>
	/**
	 * Clear the credential store
	 */
	clearCredentialStore: () => Promise<void>
	/**
	 * Get the API token for the given server
	 *
	 * @param forServer The server which the token was created by / to be used for
	 */
	getApiToken: (forServer: string) => Promise<string | null>
	/**
	 * Set the API token for the given server
	 *
	 * @param forServer The server which the token was created by / to be used for
	 * @param token The JWT token to store in the credential store
	 */
	setApiToken: (forServer: string, token: string) => Promise<void>
	/**
	 * Delete the API token for the given server
	 *
	 * @param forServer The server which the token was created by / to be used for
	 */
	deleteApiToken: (forServer: string) => Promise<void>
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
