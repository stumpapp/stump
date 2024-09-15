import { Platform, TauriRPC } from '@stump/client'
import { invoke, os } from '@tauri-apps/api'

type Return = TauriRPC & {
	getNativePlatform: () => Promise<Platform>
}

/**
 * A hook to interact with the available Tauri RPC functions. These call specific
 * [commands](https://tauri.app/v1/guides/features/command).
 */
export function useTauriRPC(): Return {
	/**
	 * A helper function to get the native platform of the user's system
	 */
	const getNativePlatform = async () => {
		const platform = await os.platform()
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
		invoke<void>('set_discord_presence', { details, status })

	const setUseDiscordPresence = (connect: boolean) =>
		invoke<void>('set_use_discord_connection', { connect })

	return {
		getNativePlatform,
		setDiscordPresence,
		setUseDiscordPresence,
	}
}
