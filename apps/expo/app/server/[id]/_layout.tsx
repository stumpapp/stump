import { SDKContext, StumpClientContextProvider } from '@stump/client'
import { Api, CreatedToken } from '@stump/sdk'
import { Redirect, Slot, useLocalSearchParams, useRouter } from 'expo-router'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { ActiveServerContext } from '~/components/activeServer'
import ServerAuthDialog from '~/components/ServerAuthDialog'
import { useSavedServers } from '~/stores'

export default function Screen() {
	const router = useRouter()

	const { savedServers, getServerToken, saveServerToken } = useSavedServers()
	const { id: serverID } = useLocalSearchParams<{ id: string }>()

	const activeServer = useMemo(
		() => savedServers.find((server) => server.id === serverID),
		[serverID, savedServers],
	)

	const [sdk, setSDK] = useState<Api | null>(null)
	const [isAuthDialogOpen, setIsAuthDialogOpen] = useState(false)

	useEffect(() => {
		if (!activeServer) return

		const configureSDK = async () => {
			const { id, url } = activeServer
			const existingToken = await getServerToken(id)
			const instance = new Api({ baseURL: url, authMethod: 'token' })
			if (!existingToken) {
				setIsAuthDialogOpen(true)
			} else {
				instance.token = existingToken.token
			}
			setSDK(instance)
		}

		if (!sdk && !isAuthDialogOpen) {
			configureSDK()
		}
	}, [activeServer, sdk, getServerToken, isAuthDialogOpen])

	const handleAuthDialogClose = useCallback(
		(token?: CreatedToken) => {
			if (token && activeServer) {
				const { access_token, expires_at } = token
				const instance = new Api({
					baseURL: activeServer.url,
					authMethod: 'token',
				})
				instance.token = access_token
				setSDK(instance)
				saveServerToken(activeServer?.id || 'dev', {
					expiresAt: new Date(expires_at),
					token: access_token,
				})
				setIsAuthDialogOpen(false)
			} else {
				router.dismissAll()
			}
		},
		[activeServer, router, saveServerToken],
	)

	if (!activeServer) {
		return <Redirect href="/" />
	}

	if (!sdk) {
		return null
	}

	return (
		<ActiveServerContext.Provider
			value={{
				activeServer: activeServer,
			}}
		>
			<StumpClientContextProvider>
				<SDKContext.Provider value={{ sdk }}>
					<ServerAuthDialog isOpen={isAuthDialogOpen} onClose={handleAuthDialogClose} />
					<Slot routerOptions={{ headerShown: false }} />
				</SDKContext.Provider>
			</StumpClientContextProvider>
		</ActiveServerContext.Provider>
	)
}
