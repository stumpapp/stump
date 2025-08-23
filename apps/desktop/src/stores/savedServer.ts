import { useCallback } from 'react'
import { match, P } from 'ts-pattern'
import { v4 as uuid } from 'uuid'
import { z } from 'zod'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import { useTauriRPC } from '../utils'

export type SavedServer = {
	id: string
	name: string
	url: string
	isDefault?: boolean
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
				password: z.string(), // Stored in secure storage
			}),
		}),
	])
	.optional()

const serverConfig = z.object({
	auth: auth.optional(),
})
export type ServerConfig = z.infer<typeof serverConfig>

const jwtPair = z.object({
	accessToken: z.string(),
	refreshToken: z.string().nullish(),
	expiresAt: z.string(),
})

export const storedTokens = z.union([
	z.object({
		apiKey: z.string(),
	}),
	z.object({
		jwt: jwtPair,
	}),
])
export type StoredTokens = z.infer<typeof storedTokens>

type SavedServerStore = {
	servers: SavedServer[]
	addServer: (server: SavedServer) => void
	editServer: (id: string, server: SavedServer) => void
	removeServer: (id: string) => void
	setDefaultServer: (serverID?: string) => void
}

export const useSavedServerStore = create<SavedServerStore>()(
	persist(
		(set) => ({
			servers: [] as SavedServer[],
			addServer: (server: SavedServer) => set((state) => ({ servers: [...state.servers, server] })),
			removeServer: (id: string) =>
				set((state) => ({ servers: state.servers.filter((server) => server.id !== id) })),
			setDefaultServer: (serverID?: string) =>
				set((state) => ({
					servers: state.servers.map((server) => ({
						...server,
						defaultServer: server.id === serverID,
					})),
				})),
			editServer: (id: string, server: SavedServer) =>
				set((state) => ({
					servers: state.servers.map((s) => (s.id === id ? server : s)),
				})),
		}),
		{
			name: 'stump-desktop-saved-servers-store',
			version: 1,
		},
	),
)

export type CreateServer = {
	config?: ServerConfig
} & Omit<SavedServer, 'id'>

// NOTE: for debugging, uncomment to clear saved tokens each render basically
// SecureStore.deleteItemAsync('stump-mobile-saved-tokens-dev')

/**
 * An RPC-like hook for interacting with saved servers and their encrypted tokens/configs.
 */
export const useSavedServers = () => {
	const rpc = useTauriRPC()
	const { servers, addServer, editServer, removeServer, setDefaultServer } = useSavedServerStore(
		(state) => state,
	)

	const getServerConfig = useCallback(
		async (id: string) => {
			const config = await rpc.getCredentials(id)
			return config ? serverConfig.safeParse({ auth: config })?.data || null : null
		},
		[rpc],
	)

	const createServerConfig = useCallback(
		async (id: string, credentials: NonNullable<Pick<ServerConfig, 'auth'>['auth']>) => {
			await rpc.setCredentials(id, credentials)
		},
		[rpc],
	)

	/**
	 * Create a new server and optionally save its config.
	 */
	const createServer = useCallback(
		async ({ config, ...server }: CreateServer) => {
			const id = uuid()
			const serverMeta = { ...server, id }
			await rpc.createServerEntry(id)
			addServer(serverMeta)
			if (server.isDefault) {
				// Ensure only one default server
				setDefaultServer(serverMeta.id)
			}
			if (config?.auth) {
				await createServerConfig(id, config.auth)
			}
			return serverMeta
		},
		[addServer, setDefaultServer, createServerConfig, rpc],
	)

	/**
	 * Update a server's metadata and optionally its config
	 *
	 * @param id The ID of the server to update
	 */
	const updateServer = useCallback(
		async (id: string, { config, ...server }: CreateServer) => {
			const serverMeta = { ...server, id }
			editServer(id, serverMeta)
			if (server.isDefault) {
				// Ensure only one default server
				setDefaultServer(serverMeta.id)
			}
			if (config?.auth) {
				await createServerConfig(id, config?.auth)
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
		async (id: string) => {
			await rpc.deleteTokens(id)
			await rpc.deleteCredentials(id)
			removeServer(id)
		},
		[removeServer, rpc],
	)

	/**
	 * Get a non-expired JWT for a server. This is **not** an API key or long-lived token.
	 *
	 * @param id The ID of the server to get the token for
	 * @returns A JWT if the token is valid, otherwise null
	 */
	const getServerToken = async (id: string) => {
		// const record = await SecureStore.getItemAsync(formatPrefix('token', id))
		const record = await rpc.getTokens(id)

		if (!record) return null

		const shouldDelete = match(record)
			.with({ jwt: P.shape({ expiresAt: P.string }) }, ({ jwt }) => {
				return new Date(jwt.expiresAt) < new Date()
			})
			.otherwise(() => false)

		if (shouldDelete) {
			await deleteServerToken(id)
			// We delete the token in storage but still return it so the caller can
			// handle the refresh
		}

		return record
	}

	/**
	 * Save a JWT for a server. This is **not** an API key or long-lived token, and should
	 * only be used for Stump servers.
	 *
	 * @param id The ID of the server to save the token for
	 * @param token The token to save
	 */
	const saveServerToken = useCallback(
		async (id: string, token: StoredTokens) => {
			await rpc.setTokens(id, token)
		},
		[rpc],
	)

	/**
	 * Delete a saved JWT for a server. This will be called whenever an expired token is
	 * attempted to be used.
	 *
	 * @param id The ID of the server to delete the token
	 */
	const deleteServerToken = async (id: string) => {
		await rpc.deleteTokens(id)
	}

	return {
		savedServers: servers,
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
