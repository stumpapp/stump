import { QueryClient } from '@tanstack/react-query'
import { createContext, useContext } from 'react'

export const QueryClientContext = createContext<QueryClient | undefined>(undefined)

export type IStumpClientContext = {
	onRedirect?: (url: string) => void
	onUnauthenticatedResponse?: (redirectUrl?: string) => void
	onConnectionWithServerChanged?: (isConnected: boolean) => void
	setUseDiscordPresence?: (connect: boolean) => void
	setDiscordPresence?: (status?: string, details?: string) => void
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
export interface StumpClientProps {
	platform: Platform
	baseUrl?: string
	setUseDiscordPresence?: (connect: boolean) => void
	setDiscordPresence?: (status?: string, details?: string) => void
}

export const useClientContext = () => {
	const context = useContext(StumpClientContext)
	if (!context) {
		throw new Error('StumpContext not found')
	}
	return context
}
