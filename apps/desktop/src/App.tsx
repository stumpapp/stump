import { StumpWebClient } from '@stump/browser'
import { DesktopAppContext, Platform, useDesktopAppContext } from '@stump/client'
import { SavedServer, User } from '@stump/sdk'
import { createStore, Store } from '@tauri-apps/plugin-store'
import { useCallback, useEffect, useState } from 'react'

import { useTauriRPC } from './utils'

// It looks like Apple fully blocks non-local IP addresses now. This is actually infuriating. OH WELL.
// There really isn't much to do? Anyone using the desktop app on macOS and wants to connect outside their local
// network will have to setup a domain name and use HTTPS. When I catch you, Apple *shakes fist*
// See:
// - https://developer.apple.com/documentation/security/preventing-insecure-network-connections
// - https://developer.apple.com/documentation/bundleresources/information_property_list/nsapptransportsecurity

function App() {
	const { store } = useDesktopAppContext()
	const { getNativePlatform, ...tauriRPC } = useTauriRPC()

	const [platform, setPlatform] = useState<Platform>('unknown')
	const [baseURL, setBaseURL] = useState<string>()
	const [mounted, setMounted] = useState(false)

	/**
	 * An effect to initialize the application, setting the platform and base URL
	 */
	useEffect(() => {
		async function init() {
			try {
				await tauriRPC.initCredentialStore()
				const platform = await getNativePlatform()
				const activeServer = await store.get<SavedServer>('active_server')
				if (activeServer) {
					setBaseURL(activeServer.uri)
				}
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
	}, [getNativePlatform, mounted, tauriRPC, store])

	const handleAuthenticated = useCallback(
		async (_user: User, token?: string) => {
			try {
				const currentServer = await store.get<SavedServer>('active_server')
				if (token && currentServer) {
					console.debug('Saving API token for', currentServer.name)
					await tauriRPC.setApiToken(currentServer.name, token)
				}
			} catch (err) {
				console.error('Failed to initialize the credential store', err)
			}
		},
		[tauriRPC, store],
	)

	const handleLogout = useCallback(async () => {
		try {
			const currentServer = await store.get<SavedServer>('active_server')
			if (currentServer) {
				await tauriRPC.deleteApiToken(currentServer.name)
			} else {
				await tauriRPC.clearCredentialStore()
			}
		} catch (err) {
			console.error('Failed to clear credential store', err)
		}
	}, [tauriRPC, store])

	// I want to wait until platform is properly set before rendering the app
	if (!mounted) {
		return null
	}

	return (
		<StumpWebClient
			platform={platform}
			authMethod="token"
			baseUrl={baseURL}
			tauriRPC={tauriRPC}
			onAuthenticated={handleAuthenticated}
			onLogout={handleLogout}
			onUnauthenticatedResponse={handleLogout}
		/>
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
