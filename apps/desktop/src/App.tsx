import '@stump/browser/styles/index.css'
import '@stump/components/styles/overrides.css'

import { StumpWebClient } from '@stump/browser'
import { ErrorFallback } from '@stump/browser/components/ErrorFallback'
import { Toaster } from '@stump/browser/components/Toaster'
import { DesktopAppContext, Platform, SavedServer, useDesktopAppContext } from '@stump/client'
import { LocaleProvider } from '@stump/i18n'
import { AuthUser, JwtTokenPair } from '@stump/sdk'
import { QueryClient, QueryClientContext } from '@tanstack/react-query'
import { createStore, Store } from '@tauri-apps/plugin-store'
import { useCallback, useEffect, useState } from 'react'
import { ErrorBoundary } from 'react-error-boundary'
import { BrowserRouter, Route, Routes } from 'react-router-dom'

import Home from './Home'
import SavedServerEntry from './SavedServerEntry'
import { useSavedServerStore } from './stores/savedServer'
import { useTauriRPC } from './utils'

const localClient = new QueryClient()

// It looks like Apple fully blocks non-local IP addresses now. This is actually infuriating. OH WELL.
// There really isn't much to do? Anyone using the desktop app on macOS and wants to connect outside their local
// network will have to setup a domain name and use HTTPS. When I catch you, Apple *shakes fist*
// See:
// - https://developer.apple.com/documentation/security/preventing-insecure-network-connections
// - https://developer.apple.com/documentation/bundleresources/information_property_list/nsapptransportsecurity

function App() {
	const { store } = useDesktopAppContext()
	const { getNativePlatform, ...tauriRPC } = useTauriRPC()

	const servers = useSavedServerStore((store) => store.servers)

	const [platform, setPlatform] = useState<Platform>('unknown')
	const [baseURL, setBaseURL] = useState<string>()
	const [mounted, setMounted] = useState(false)

	/**
	 * An effect to initialize the application, setting the platform and base URL
	 */
	useEffect(() => {
		async function init() {
			try {
				await tauriRPC.initCredentialStore(servers.map((s) => s.id))
				const platform = await getNativePlatform()
				// const activeServer = await store.get<SavedServer>('active_server')
				// if (activeServer) {
				// 	setBaseURL(activeServer.uri)
				// }
				setPlatform(platform)
			} catch (error) {
				console.error('Critical failure! Unable to initialize the application', error)
			} finally {
				setMounted(true)
			}
		}

		if (!mounted) {
			init()
		}
	}, [getNativePlatform, mounted, tauriRPC, store, servers])

	// const handleAuthenticated = useCallback(
	// 	async (_user: AuthUser, tokens?: JwtTokenPair) => {
	// 		try {
	// 			const currentServer = await store.get<SavedServer>('active_server')
	// 			if (tokens && currentServer) {
	// 				await tauriRPC.setTokens(currentServer.name, tokens)
	// 			}
	// 		} catch (err) {
	// 			console.error('Failed to initialize the credential store', err)
	// 		}
	// 	},
	// 	[tauriRPC, store],
	// )

	// const handleLogout = useCallback(async () => {
	// 	try {
	// 		const currentServer = await store.get<SavedServer>('active_server')
	// 		if (currentServer) {
	// 			await tauriRPC.deleteTokens(currentServer.name)
	// 		} else {
	// 			await tauriRPC.clearStore()
	// 		}
	// 	} catch (err) {
	// 		console.error('Failed to clear credential store', err)
	// 	}
	// }, [tauriRPC, store])

	// I want to wait until platform is properly set before rendering the app
	if (!mounted) {
		return null
	}

	return (
		<BrowserRouter>
			<Routes>
				<Route
					path="/"
					element={
						<QueryClientContext.Provider value={localClient}>
							<LocaleProvider>
								<Home />
							</LocaleProvider>
							<Toaster />
						</QueryClientContext.Provider>
					}
				/>
				<Route
					path="server/:serverId/*"
					element={
						<ErrorBoundary FallbackComponent={ErrorFallback}>
							<SavedServerEntry tauriRPC={tauriRPC} />
						</ErrorBoundary>
					}
				/>
			</Routes>
		</BrowserRouter>
	)
}

export default function AppEntry() {
	const [store, setStore] = useState<Store>()

	useEffect(() => {
		const init = async () => {
			setStore(await createStore('settings.json'))
		}

		if (!store) {
			init()
		}
	}, [store])

	if (!store) {
		return null
	}

	return (
		<DesktopAppContext.Provider value={{ store }}>
			<App />
		</DesktopAppContext.Provider>
	)
}
