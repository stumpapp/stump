import { useClientContext, useSDK } from '@stump/client'
import { OPDSLegacyOpenSearchDoc } from '@stump/sdk'
import { OPDSLegacyFeed } from '@stump/sdk'
import { QueryObserverResult, RefetchOptions, useQuery } from '@tanstack/react-query'
import { createContext, useContext, useEffect, useMemo, useRef } from 'react'

import { pullServerAvatar } from '~/backgroundTasks/pullServerLogo'
import { FullScreenLoader } from '~/components/ui'
import {
	feedLegacyHasSearch,
	getLegacySearchDocumentURL,
	getLegacySelfLinkURL,
} from '~/lib/opdsLegacy/utils'
import { isOPDSAuthError } from '~/lib/sdk/auth'

import { useActiveServer } from './ActiveServerProvider'

export type OPDSLegacyCatalogMeta = Pick<OPDSLegacyFeed, 'id' | 'title' | 'author'> & {
	url: string | undefined
}

export type OPDSLegacyFeedContextValue = {
	catalogMeta: OPDSLegacyCatalogMeta | null
	searchDoc: OPDSLegacyOpenSearchDoc | null
	hasSearch: boolean
	isLoading: boolean
	error: unknown | null
	refetch: (
		options?: RefetchOptions,
	) => Promise<QueryObserverResult<OPDSLegacyFeed | undefined, Error>>
}

export const OPDSLegacyFeedContext = createContext<OPDSLegacyFeedContextValue | null>(null)

export const useOPDSLegacyFeedContext = () => {
	const context = useContext(OPDSLegacyFeedContext)
	if (!context) {
		throw new Error('useOPDSLegacyFeedContext must be used within an OPDSLegacyFeedContextProvider')
	}
	return context
}

type OPDSFeedProviderProps = {
	children: React.ReactNode
}

export function OPDSLegacyFeedProvider({ children }: OPDSFeedProviderProps) {
	const { sdk } = useSDK()
	const { activeServer, effectiveServerUrl } = useActiveServer()
	const { onUnauthenticatedResponse } = useClientContext()

	const {
		data: catalog,
		isLoading: isCatalogLoading,
		error,
		refetch,
	} = useQuery({
		queryKey: [sdk.opds.keys.catalog, activeServer.id, activeServer.kind, effectiveServerUrl],
		// stump servers are configured as just the root of the instance, but opds servers
		// are configured the root of the opds feed, so we handle them a bit differently
		queryFn: () =>
			activeServer.kind === 'stump'
				? sdk.opdsLegacy.catalog()
				: sdk.opdsLegacy.feed(effectiveServerUrl),
		enabled: !!activeServer,
		throwOnError: false,
	})

	const searchDocumentURL = getLegacySearchDocumentURL(catalog, sdk?.rootURL)

	const { data: searchDocument } = useQuery({
		enabled: !!searchDocumentURL,
		queryKey: ['searchDocument', searchDocumentURL],
		queryFn: () => sdk.opdsLegacy.searchDocument(searchDocumentURL!),
	})

	useEffect(() => {
		if (!error) return
		if (isOPDSAuthError(error)) {
			onUnauthenticatedResponse?.(undefined, error.response?.data)
		} else if (error) {
			throw error
		}
	}, [error, onUnauthenticatedResponse])

	const didSyncAvatar = useRef(false)
	useEffect(() => {
		if (!sdk || !sdk.isAuthed || didSyncAvatar.current || !activeServer) return
		if (activeServer.avatar) return

		const syncUserAvatar = async () => {
			await pullServerAvatar(activeServer, sdk)
			didSyncAvatar.current = true
		}
		syncUserAvatar()
	}, [sdk, activeServer])

	const feedContextValue = useMemo(
		() => ({
			catalogMeta: catalog
				? {
						id: catalog.id,
						url: getLegacySelfLinkURL(catalog, sdk.rootURL) ?? effectiveServerUrl,
						title: catalog.title,
						author: catalog.author,
					}
				: null,
			searchDoc: searchDocument ?? null,
			hasSearch: feedLegacyHasSearch(catalog),
			isLoading: isCatalogLoading,
			error: error ?? null,
			refetch,
		}),
		[catalog, searchDocument, isCatalogLoading, error, refetch, effectiveServerUrl, sdk.rootURL],
	)

	if (isCatalogLoading && !catalog) {
		return <FullScreenLoader label="Loading feed..." />
	}

	return (
		<OPDSLegacyFeedContext.Provider value={feedContextValue}>
			{children}
		</OPDSLegacyFeedContext.Provider>
	)
}
