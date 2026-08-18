import { UserPermission } from '@stump/graphql'
import { AuthUser } from '@stump/sdk'
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { useDebounce } from 'rooks'

import { SavedServer } from '~/stores/savedServer'

import { useWifiSsid } from './WifiSsidProvider'

export type IActiveServerContext = {
	activeServer: SavedServer
}

export const ActiveServerContext = createContext<IActiveServerContext | undefined>(undefined)

type ActiveServerProviderProps = {
	children: React.ReactNode
	activeServer: SavedServer
}

export function ActiveServerProvider({ children, activeServer }: ActiveServerProviderProps) {
	const { ssid, permissionStatus } = useWifiSsid()

	const [effectiveServerUrl, setEffectiveServerUrl] = useState<string | null>(null)

	const localProfile = activeServer.localProfile

	const evaluateSsidAndSwitchUrl = useCallback(() => {
		const shouldUseLocal = localProfile != null && ssid != null && localProfile.ssid === ssid
		setEffectiveServerUrl(shouldUseLocal ? localProfile.url : activeServer.url)
	}, [ssid, localProfile, activeServer.url])

	const debouncedEvaluateSsidAndSwitchUrl = useDebounce(evaluateSsidAndSwitchUrl, 500)

	const lastSsid = useRef<string | null>(null)
	useEffect(() => {
		if (permissionStatus !== 'granted') return
		if (ssid === lastSsid.current) return

		lastSsid.current = ssid
		debouncedEvaluateSsidAndSwitchUrl()
		// TODO: need localProfile?.url in deps? im sussed by it potentially not handling config change well
	}, [permissionStatus, ssid, debouncedEvaluateSsidAndSwitchUrl])

	return (
		<ActiveServerContext.Provider
			value={{
				activeServer: {
					...activeServer,
					url: effectiveServerUrl ?? activeServer.url,
				},
			}}
		>
			{children}
		</ActiveServerContext.Provider>
	)
}

export const useActiveServer = () => {
	const context = useContext(ActiveServerContext)
	if (!context) {
		throw new Error('useActiveServer must be used within a ActiveServerProvider')
	}
	return context
}

/**
 * Safe variant of useActiveServer that returns undefined if there's no active server
 * Pretty much just used for features that persist across servers (e.g., downloads)
 */
export const useActiveServerSafe = () => useContext(ActiveServerContext)

export type PermissionEnforcerOptions = {
	onFailure?: () => void
}

export type IStumpServerContext = {
	user: AuthUser | null
	isServerOwner: boolean
	checkPermission: (permission: UserPermission) => boolean
	enforcePermission: (permission: UserPermission, options?: PermissionEnforcerOptions) => void
}

export const StumpServerContext = createContext<IStumpServerContext | undefined>(undefined)

export const useStumpServer = () => {
	const context = useContext(StumpServerContext)
	const activeServerCtx = useActiveServer()
	if (!context) {
		throw new Error('useStumpServer must be used within a StumpServerProvider')
	}
	return {
		...context,
		...activeServerCtx,
	}
}
