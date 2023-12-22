import { Platform } from '@stump/client'
import StumpInterface from '@stump/interface'
import { invoke, os } from '@tauri-apps/api'
import { useEffect, useMemo, useState } from 'react'

const VITE_STUMP_SERVER_IS_BUNDLED = import.meta.env.VITE_STUMP_SERVER_IS_BUNDLED === 'true'

export default function App() {
	function getPlatform(platform: string): Platform {
		switch (platform) {
			case 'darwin':
				return 'macOS'
			case 'win32':
				return 'windows'
			case 'linux':
				return 'linux'
			default:
				return 'browser'
		}
	}

	const setDiscordPresence = (status?: string, details?: string) =>
		invoke<unknown>('set_discord_presence', { details, status })

	const setUseDiscordPresence = (connect: boolean) =>
		invoke<unknown>('set_use_discord_connection', { connect })

	const hideSplashScreen = () => invoke<unknown>('close_splashscreen')

	const [platform, setPlatform] = useState<Platform>('unknown')
	const [mounted, setMounted] = useState(false)

	useEffect(() => {
		async function init() {
			const platform = await os.platform()
			setPlatform(getPlatform(platform))
			setMounted(true)
			setTimeout(hideSplashScreen, 1000)
		}

		init()
	}, [])

	const baseUrl = useMemo(() => {
		if (!VITE_STUMP_SERVER_IS_BUNDLED) {
			return undefined
		}

		// TODO: The port is configurable...
		if (platform === 'windows') {
			return 'https://tauri.localhost:10801'
		} else {
			return 'http://localhost:10801'
		}
	}, [platform])

	// I want to wait until platform is properly set before rendering the interface
	if (!mounted) {
		return null
	}

	return (
		<StumpInterface
			platform={platform}
			setUseDiscordPresence={setUseDiscordPresence}
			setDiscordPresence={setDiscordPresence}
			baseUrl={baseUrl}
		/>
	)
}
