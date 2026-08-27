import { useClientContext, useSDK } from '@stump/client'
import { OPDSFeed } from '@stump/sdk'
import { QueryObserverResult, RefetchOptions, useQuery } from '@tanstack/react-query'
import { createContext, useContext, useEffect, useMemo, useRef } from 'react'

import { pullServerAvatar } from '~/backgroundTasks/pullServerLogo'
import { FullScreenLoader } from '~/components/ui'
import { feedHasSearch, getSearchURL } from '~/lib/opds/search'
import { isOPDSAuthError } from '~/lib/sdk/auth'

import { useActiveServer } from './ActiveServerProvider'

export type OPDSFeedContextValue = {
	catalog: OPDSFeed | null
	searchURL: string | undefined
	hasSearch: boolean
	isLoading: boolean
	error: unknown | null
	refetch: (options?: RefetchOptions) => Promise<QueryObserverResult<OPDSFeed | undefined, Error>>
}

export const OPDSFeedContext = createContext<OPDSFeedContextValue | null>(null)

export const useOPDSFeedContext = () => {
	const context = useContext(OPDSFeedContext)
	if (!context) {
		throw new Error('useOPDSFeedContext must be used within an OPDSFeedContextProvider')
	}
	return context
}

type OPDSFeedProviderProps = {
	children: React.ReactNode
	isAuthPending: boolean
}

export function OPDSFeedProvider({ children, isAuthPending }: OPDSFeedProviderProps) {
	const { sdk } = useSDK()
	const { activeServer, effectiveServerUrl } = useActiveServer()
	const { onUnauthenticatedResponse } = useClientContext()

	const {
		data: catalog,
		isLoading: isCatalogLoading,
		error,
		refetch,
	} = useQuery({
		queryKey: [sdk.opds.keys.catalog, effectiveServerUrl, activeServer.kind],
		queryFn: () => {
			if (activeServer.kind === 'stump') {
				return sdk.opds.catalog()
			} else {
				return sdk.opds.feed(effectiveServerUrl)
			}
		},
		enabled: !isAuthPending,
		throwOnError: false,
	})

	useEffect(() => {
		if (!error || isAuthPending) return
		if (isOPDSAuthError(error)) {
			onUnauthenticatedResponse?.(undefined, error.response?.data)
		}
	}, [error, isAuthPending, onUnauthenticatedResponse])

	// it isn't overly ideal to sync until failure, but i think it's also largely
	// fine. it's a tiny operation
	const didSyncLogo = useRef(false)
	useEffect(() => {
		if (error || isAuthPending || didSyncLogo.current) return
		if (activeServer.avatar) return

		async function pullLogo() {
			await pullServerAvatar(activeServer, sdk)
			didSyncLogo.current = true
		}

		pullLogo()
	}, [sdk, activeServer, error, isAuthPending])

	const feedContextValue = useMemo(
		() => ({
			catalog: catalog ?? null,
			searchURL: getSearchURL(catalog, sdk?.rootURL),
			hasSearch: feedHasSearch(catalog),
			isLoading: isCatalogLoading,
			error: error ?? null,
			refetch,
		}),
		[catalog, sdk?.rootURL, isCatalogLoading, error, refetch],
	)

	if (isCatalogLoading && !catalog) {
		return <FullScreenLoader label="Loading feed..." />
	}

	const isAuthError = isOPDSAuthError(error)

	if (isAuthError || isAuthPending) {
		return <FullScreenLoader label="Authenticating..." />
	}

	return <OPDSFeedContext.Provider value={feedContextValue}>{children}</OPDSFeedContext.Provider>
}
