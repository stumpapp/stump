import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createContext, PropsWithChildren, useContext } from 'react'

import { queryClient } from './client'

export const QueryClientContext = createContext<QueryClient | undefined>(undefined)

export type IStumpClientContext = {
	onRedirect?: (url: string) => void
	setUseDiscordPresence?: (connect: boolean) => void
	setDiscordPresence?: (status?: string, details?: string) => void
}
export const StumpClientContext = createContext<IStumpClientContext | undefined>(undefined)
export function StumpClientContextProvider({
	children,
	...context
}: PropsWithChildren<IStumpClientContext>) {
	return (
		<StumpClientContext.Provider value={context}>
			<QueryClientContext.Provider value={queryClient}>
				<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
			</QueryClientContext.Provider>
		</StumpClientContext.Provider>
	)
}

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
