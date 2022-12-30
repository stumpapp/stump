import '@stump/interface/styles'

import { Platform, StumpQueryProvider } from '@stump/client'
import StumpInterface from '@stump/interface'
import { invoke, os } from '@tauri-apps/api'
import { useEffect, useState } from 'react'

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

	const [platform, setPlatform] = useState<Platform>('unknown')
	const [mounted, setMounted] = useState(false)

	useEffect(() => {
		os.platform().then((platform) => {
			setPlatform(getPlatform(platform))
			// TODO: remove this, should be handled in the interface :D
			setUseDiscordPresence(true)
			setDiscordPresence()
			// ^^
			setMounted(true)
		})
	}, [])

	// I want to wait until platform is properly set before rendering the interface
	if (!mounted) {
		return null
	}

	return (
		<StumpQueryProvider>
			<StumpInterface
				platform={platform}
				setUseDiscordPresence={setUseDiscordPresence}
				setDiscordPresence={setDiscordPresence}
			/>
		</StumpQueryProvider>
	)
}
