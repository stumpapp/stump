import {
	CredentialStoreTokenState,
	Platform,
	ServerConfig,
	StoredCredentials,
	TauriRPC,
} from '@stump/client'
import { invoke } from '@tauri-apps/api/core'
import * as os from '@tauri-apps/plugin-os'

import { StoredTokens } from '../stores/savedServer'

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
		// TODO(tauri-v2): Just use the platform string directly, they're more readable/similar now in v2
		switch (platform) {
			case 'macos':
				return 'macOS'
			case 'windows':
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

	const initCredentialStore = (servers: string[]) =>
		invoke<void>('init_credential_store', { servers })

	const getStoreAuthState = () => invoke<CredentialStoreTokenState>('get_credential_store_state')

	const clearStore = () => invoke<void>('clear_credential_store')

	const getCredentials = (forServer: string) =>
		invoke<StoredCredentials | null>('get_credentials', { server: forServer })

	const setCredentials = (forServer: string, config: StoredCredentials) =>
		invoke<ServerConfig>('set_credentials', { server: forServer, credentials: config })

	const deleteCredentials = (forServer: string) =>
		invoke<void>('delete_credentials', { server: forServer })

	const deleteTokens = (forServer: string) => invoke<void>('delete_tokens', { server: forServer })

	const getTokens = (forServer: string) =>
		invoke<StoredTokens | null>('get_tokens', { server: forServer })

	const setTokens = (forServer: string, tokens: StoredTokens) =>
		invoke<void>('set_tokens', { server: forServer, tokens })

	const createServerEntry = (forServer: string) =>
		invoke<void>('create_server_entry', { server: forServer })

	return {
		clearStore,
		deleteTokens,
		getTokens,
		getStoreAuthState,
		getCurrentServerName,
		getNativePlatform,
		getCredentials,
		setCredentials,
		deleteCredentials,
		initCredentialStore,
		setTokens,
		setDiscordPresence,
		setUseDiscordPresence,
		createServerEntry,
	}
}
