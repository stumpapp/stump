import '@stump/browser/styles/index.css'
import '@stump/components/styles/overrides.css'

import { ErrorFallback } from '@stump/browser/components/ErrorFallback'
import { Toaster } from '@stump/browser/components/Toaster'
import { useAppStore } from '@stump/browser/stores'
import { DesktopAppContext, useDesktopAppContext } from '@stump/client'
import { LocaleProvider } from '@stump/i18n'
import { QueryClient, QueryClientContext } from '@tanstack/react-query'
import { createStore, Store } from '@tauri-apps/plugin-store'
import { useEffect, useState } from 'react'
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

	const [mounted, setMounted] = useState(false)

	const setPlatform = useAppStore((state) => state.setPlatform)

	/**
	 * An effect to initialize the application, setting the platform and base URL
	 */
	useEffect(() => {
		async function init() {
			try {
				await tauriRPC.initCredentialStore(servers.map((s) => s.id))
				const platform = await getNativePlatform()
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
	}, [getNativePlatform, mounted, tauriRPC, store, servers, setPlatform])

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
