import { StumpWebClient } from '@stump/browser'
import { Platform } from '@stump/client'
import { SavedServer, User } from '@stump/sdk'
import { useCallback, useEffect, useState } from 'react'
import { Store } from 'tauri-plugin-store-api'

import { useTauriRPC } from './utils'

// It looks like Apple fully blocks non-local IP addresses now. This is actually infuriating. OH WELL.
// There really isn't much to do? Anyone using the desktop app on macOS and wants to connect outside their local
// network will have to setup a domain name and use HTTPS. When I catch you, Apple *shakes fist*
// See:
// - https://developer.apple.com/documentation/security/preventing-insecure-network-connections
// - https://developer.apple.com/documentation/bundleresources/information_property_list/nsapptransportsecurity

const store = new Store('settings.json')

export default function App() {
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
	}, [getNativePlatform, mounted])

	const handleAuthenticated = useCallback(
		async (user: User, token?: string) => {
			try {
				const currentServer = await store.get<SavedServer>('active_server')
				await tauriRPC.initCredentialStore(user.username)
				if (token && currentServer) {
					await tauriRPC.setApiToken(currentServer.name, token)
				}
			} catch (err) {
				console.error('Failed to initialize the credential store', err)
			}
		},
		[tauriRPC],
	)

	// I want to wait until platform is properly set before rendering the app
	if (!mounted) {
		return null
	}

	return (
		<StumpWebClient
			platform={platform}
			authMethod={platform === 'windows' ? 'token' : 'session'}
			baseUrl={baseURL}
			tauriRPC={tauriRPC}
			onAuthenticated={handleAuthenticated}
		/>
	)
}
