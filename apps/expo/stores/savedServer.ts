import AsyncStorage from '@react-native-async-storage/async-storage'
import { uuid } from 'expo-modules-core'
import * as SecureStore from 'expo-secure-store'
import { useCallback } from 'react'
import { z } from 'zod'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

type ServerID = string
type SupportedServer = 'stump' | 'opds'

export type SavedServer = {
	id: ServerID
	name: string
	url: string
	kind: SupportedServer // TODO: support showing stump as opds, too
	stumpOPDS?: boolean
}

export type SavedServerWithConfig = SavedServer & {
	config: ServerConfig | null
}

// const bearerAuth = z.object({
// 	bearer: z.string(),
// })

// const basicAuth = z.object({
// 	basic: z.object({
// 		username: z.string(),
// 		password: z.string(), // Encrypted with expo-secure-store, so should be OK
// 	}),
// })

// const auth = bearerAuth
// 	.partial()
// 	.and(basicAuth.partial())
// 	.optional()
// 	.refine((data) => !data || Object.keys(data).length >= 1, {
// 		message: 'Must have at least one auth method',
// 	})

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

const managedToken = z
	.object({
		token: z.string(),
		expiresAt: z.string(),
	})
	.transform((data) => ({
		...data,
		expiresAt: new Date(data.expiresAt),
	}))
type ManagedToken = z.infer<typeof managedToken>

const SAVED_TOKEN_PREFIX = 'stump-mobile-saved-tokens-' as const
const SAVED_CONFIG_PREFIX = 'stump-mobile-saved-configs-' as const
const formatPrefix = (prefix: 'token' | 'config', id: ServerID) =>
	`${prefix === 'config' ? SAVED_CONFIG_PREFIX : SAVED_TOKEN_PREFIX}${id}`

type SavedServerStore = {
	servers: SavedServer[]
	addServer: (server: SavedServer) => void
	editServer: (id: ServerID, server: SavedServer) => void
	removeServer: (id: ServerID) => void
	defaultServer?: SavedServer
	setDefaultServer: (server: SavedServer) => void
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
			editServer: (id: ServerID, server: SavedServer) =>
				set((state) => ({
					servers: state.servers.map((s) => (s.id === id ? server : s)),
				})),
			defaultServer: undefined,
			setDefaultServer: (server: SavedServer) => set({ defaultServer: server }),
			showStumpServers: true,
			setShowStumpServers: (show) => set({ showStumpServers: show }),
		}),
		{
			name: 'stump-mobile-saved-servers-store',
			storage: createJSONStorage(() => AsyncStorage),
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
export const useSavedServers = () => {
	const { servers, addServer, editServer, removeServer, setDefaultServer, showStumpServers } =
		useSavedServerStore((state) => state)

	const getServerConfig = async (id: ServerID) => {
		const config = await SecureStore.getItemAsync(formatPrefix('config', id))
		return config ? serverConfig.parse(JSON.parse(config)) : null
	}

	const createServerConfig = useCallback(async (id: ServerID, config: ServerConfig) => {
		await SecureStore.setItemAsync(formatPrefix('config', id), JSON.stringify(config))
		return config
	}, [])

	const createServer = useCallback(
		async ({ config, ...server }: CreateServer) => {
			const id = uuid.v4()
			const serverMeta = { ...server, id }
			addServer(serverMeta)
			if (server.defaultServer) {
				setDefaultServer(serverMeta)
			}
			if (config) {
				await createServerConfig(id, config)
			}
			return serverMeta
		},
		[addServer, setDefaultServer, createServerConfig],
	)

	const updateServer = useCallback(
		async (id: ServerID, { config, ...server }: CreateServer) => {
			const serverMeta = { ...server, id }
			editServer(id, serverMeta)
			if (server.defaultServer) {
				setDefaultServer(serverMeta)
			}
			if (config) {
				await createServerConfig(id, config)
			}
			return serverMeta
		},
		[setDefaultServer, editServer, createServerConfig],
	)

	const deleteServer = useCallback(
		async (id: ServerID) => {
			await SecureStore.deleteItemAsync(formatPrefix('config', id))
			await SecureStore.deleteItemAsync(formatPrefix('token', id))
			removeServer(id)
		},
		[removeServer],
	)

	const getServerToken = async (id: ServerID) => {
		const record = await SecureStore.getItemAsync(formatPrefix('token', id))

		const token = record ? managedToken.parse(JSON.parse(record)) : null
		if (!token) return null

		if (token.expiresAt < new Date()) {
			await deleteServerToken(id)
			return null
		}

		return token
	}

	const saveServerToken = async (id: ServerID, token: ManagedToken) => {
		await SecureStore.setItemAsync(formatPrefix('token', id), JSON.stringify(token))
	}

	const deleteServerToken = async (id: ServerID) => {
		await SecureStore.deleteItemAsync(formatPrefix('token', id))
	}

	return {
		savedServers: showStumpServers ? servers : servers.filter((server) => server.kind !== 'stump'),
		stumpEnabled: showStumpServers,
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
