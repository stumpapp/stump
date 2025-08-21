import { uuid } from 'expo-modules-core'
import * as SecureStore from 'expo-secure-store'
import { useCallback } from 'react'
import { z } from 'zod'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

import { ZustandMMKVStorage } from './store'

type ServerID = string
export type ServerKind = 'stump' | 'opds'

export type SavedServer = {
	id: ServerID
	name: string
	url: string
	kind: ServerKind
	stumpOPDS?: boolean
	defaultServer?: boolean
}

export type SavedServerWithConfig = SavedServer & {
	config: ServerConfig | null
}

const auth = z
	.union([
		z.object({
			bearer: z.string(),
		}),
		z.object({
			basic: z.object({
				username: z.string(),
				password: z.string(), // Encrypted with expo-secure-store, so should be OK
			}),
		}),
	])
	.optional()

const serverConfig = z.object({
	customHeaders: z.record(z.string()).optional(),
	auth: auth.optional(),
})
export type ServerConfig = z.infer<typeof serverConfig>

const managedToken = z.object({
	accessToken: z.string(),
	refreshToken: z.string().nullish(),
	expiresAt: z.string(),
})
export type ManagedToken = z.infer<typeof managedToken>

const SAVED_TOKEN_PREFIX = 'stump-mobile-saved-tokens-' as const
const SAVED_CONFIG_PREFIX = 'stump-mobile-saved-configs-' as const
const formatPrefix = (prefix: 'token' | 'config', id: ServerID) =>
	`${prefix === 'config' ? SAVED_CONFIG_PREFIX : SAVED_TOKEN_PREFIX}${id}`

type SavedServerStore = {
	servers: SavedServer[]
	addServer: (server: SavedServer) => void
	editServer: (id: ServerID, server: SavedServer) => void
	removeServer: (id: ServerID) => void
	setDefaultServer: (serverID?: string) => void
	showStumpServers: boolean
	setShowStumpServers: (show: boolean) => void
}

export const useSavedServerStore = create<SavedServerStore>()(
	persist(
		(set) => ({
			servers: [] as SavedServer[],
			addServer: (server: SavedServer) => set((state) => ({ servers: [...state.servers, server] })),
			removeServer: (id: ServerID) =>
				set((state) => ({ servers: state.servers.filter((server) => server.id !== id) })),
			setDefaultServer: (serverID?: string) =>
				set((state) => ({
					servers: state.servers.map((server) => ({
						...server,
						defaultServer: server.id === serverID,
					})),
				})),
			editServer: (id: ServerID, server: SavedServer) =>
				set((state) => ({
					servers: state.servers.map((s) => (s.id === id ? server : s)),
				})),
			showStumpServers: true,
			setShowStumpServers: (show) => set({ showStumpServers: show }),
		}),
		{
			name: 'stump-mobile-saved-servers-store',
			storage: createJSONStorage(() => ZustandMMKVStorage),
			version: 1,
		},
	),
)

export type CreateServer = {
	config?: ServerConfig
	defaultServer?: boolean
} & Omit<SavedServer, 'id'>

// NOTE: for debugging, uncomment to clear saved tokens each render basically
// SecureStore.deleteItemAsync('stump-mobile-saved-tokens-dev')

// TODO: safety in parsing
/**
 * An RPC-like hook for interacting with saved servers and their encrypted tokens/configs.
 */
export const useSavedServers = () => {
	const {
		servers,
		addServer,
		editServer,
		removeServer,
		setDefaultServer,
		showStumpServers,
		setShowStumpServers,
	} = useSavedServerStore((state) => state)

	const getServerConfig = async (id: ServerID) => {
		const config = await SecureStore.getItemAsync(formatPrefix('config', id))
		return config ? serverConfig.parse(JSON.parse(config)) : null
	}

	const createServerConfig = useCallback(async (id: ServerID, config: ServerConfig) => {
		await SecureStore.setItemAsync(formatPrefix('config', id), JSON.stringify(config))
		return config
	}, [])

	/**
	 * Create a new server and optionally save its config.
	 */
	const createServer = useCallback(
		async ({ config, ...server }: CreateServer) => {
			const id = uuid.v4()
			const serverMeta = { ...server, id }
			addServer(serverMeta)
			if (server.defaultServer) {
				// Ensure only one default server
				setDefaultServer(serverMeta.id)
			}
			if (config) {
				await createServerConfig(id, config)
			}
			return serverMeta
		},
		[addServer, setDefaultServer, createServerConfig],
	)

	/**
	 * Update a server's metadata and optionally its config
	 *
	 * @param id The ID of the server to update
	 */
	const updateServer = useCallback(
		async (id: ServerID, { config, ...server }: CreateServer) => {
			const serverMeta = { ...server, id }
			editServer(id, serverMeta)
			if (server.defaultServer) {
				// Ensure only one default server
				setDefaultServer(serverMeta.id)
			}
			if (config) {
				await createServerConfig(id, config)
			}
			return serverMeta
		},
		[setDefaultServer, editServer, createServerConfig],
	)

	/**
	 * Delete a server and any associated data (config, token) from storage.
	 *
	 * @param id The ID of the server to delete
	 */
	const deleteServer = useCallback(
		async (id: ServerID) => {
			await SecureStore.deleteItemAsync(formatPrefix('config', id))
			await SecureStore.deleteItemAsync(formatPrefix('token', id))
			removeServer(id)
		},
		[removeServer],
	)

	/**
	 * Get a non-expired JWT for a server. This is **not** an API key or long-lived token.
	 *
	 * @param id The ID of the server to get the token for
	 * @returns A JWT if the token is valid, otherwise null
	 */
	const getServerToken = async (id: ServerID) => {
		const record = await SecureStore.getItemAsync(formatPrefix('token', id))

		const token = record ? managedToken.safeParse(JSON.parse(record))?.data : null

		if (record && !token) {
			console.warn('Malformed token record detected')
			await deleteServerToken(id)
		}

		if (!token) return null

		if (new Date(token.expiresAt) < new Date()) {
			await deleteServerToken(id)
			// We delete the token in storage but still return it so the caller can
			// handle the refresh
		}

		return token
	}

	/**
	 * Save a JWT for a server. This is **not** an API key or long-lived token, and should
	 * only be used for Stump servers.
	 *
	 * @param id The ID of the server to save the token for
	 * @param token The token to save
	 */
	const saveServerToken = async (id: ServerID, token: ManagedToken) => {
		await SecureStore.setItemAsync(formatPrefix('token', id), JSON.stringify(token))
	}

	/**
	 * Delete a saved JWT for a server. This will be called whenever an expired token is
	 * attempted to be used.
	 *
	 * @param id The ID of the server to delete the token
	 */
	const deleteServerToken = async (id: ServerID) => {
		await SecureStore.deleteItemAsync(formatPrefix('token', id))
	}

	/**
	 * Set whether or not to show stump servers in the list of saved servers
	 */
	const setStumpEnabled = useCallback(
		(enabled: boolean) => {
			const defaultServer = servers.find((server) => server.defaultServer)
			if (!enabled && defaultServer?.kind === 'stump') {
				// If we're disabling stump servers, and the default server is a stump server, we need to unset it
				setDefaultServer()
			}
			setShowStumpServers(enabled)
		},
		[servers, setDefaultServer, setShowStumpServers],
	)

	return {
		savedServers: showStumpServers ? servers : servers.filter((server) => server.kind !== 'stump'),
		stumpEnabled: showStumpServers,
		setStumpEnabled,
		createServer,
		updateServer,
		deleteServer,
		getServerConfig,
		createServerConfig,
		getServerToken,
		saveServerToken,
		deleteServerToken,
		setDefaultServer,
	}
}
