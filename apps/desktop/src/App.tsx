import { StumpWebClient } from '@stump/browser'
import { Platform } from '@stump/client'
import { SavedServer } from '@stump/types'
import { useEffect, useState } from 'react'
import { Store } from 'tauri-plugin-store-api'

import { useTauriRPC } from './utils'

const store = new Store('settings.json')

// TODO(desktop): We need an AppEntry which effectively either renders _this_ app or
// the web app based on whether we are within a tauri runtime or not. Today, this app is
// build to run _only_ within a tauri runtime, so things like useTauriRPC will throw
// errors if we try to run this app in a web browser.
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

	// I want to wait until platform is properly set before rendering the app
	if (!mounted) {
		return null
	}

	return <StumpWebClient platform={platform} baseUrl={baseURL} tauriRPC={tauriRPC} />
}
