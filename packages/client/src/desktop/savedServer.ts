import { z } from 'zod'

export type SavedServer = {
	id: string
	name: string
	uri: string
	isDefault?: boolean
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

export const serverConfig = z.object({
	auth: auth.optional(),
})
export type ServerConfig = z.infer<typeof serverConfig>

export const managedToken = z
	.object({
		accessToken: z.string(),
		refreshToken: z.string().nullish(),
		expiresAt: z.string(),
	})
	.transform((data) => ({
		...data,
		expiresAt: new Date(data.expiresAt),
	}))
export type ManagedToken = z.infer<typeof managedToken>

export type DesktopAppStore = {
	runBundledServer: boolean
	activeServer: SavedServer | null
	connectedServers: SavedServer[]
}
