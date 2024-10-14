import { Platform, TauriRPC } from '@stump/client'
import { CredentialStoreTokenState } from '@stump/sdk'
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

	const getCurrentServerName = () => invoke<string | null>('get_current_server')

	const initCredentialStore = () => invoke<void>('init_credential_store')

	const getCredentialStoreState = () =>
		invoke<CredentialStoreTokenState>('get_credential_store_state')

	const clearCredentialStore = () => invoke<void>('clear_credential_store')

	const deleteApiToken = (forServer: string) =>
		invoke<void>('delete_api_token', { server: forServer })

	const getApiToken = (forServer: string) =>
		invoke<string | null>('get_api_token', { server: forServer })

	const setApiToken = (forServer: string, token: string) =>
		invoke<void>('set_api_token', { server: forServer, token })

	return {
		clearCredentialStore,
		deleteApiToken,
		getApiToken,
		getCredentialStoreState,
		getCurrentServerName,
		getNativePlatform,
		initCredentialStore,
		setApiToken,
		setDiscordPresence,
		setUseDiscordPresence,
	}
}
