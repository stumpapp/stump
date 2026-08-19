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

// TODO: i don't love that the current methodolgy for dynamic urls is to
// overwrite url in the provider, it kinda masks what is being done and isn't
// immediately clear e.g. when inspecting the active server type. i can document
// the url field in the type as such, but still don't love it. i'll sit on it.
//
export function ActiveServerProvider({ children, activeServer }: ActiveServerProviderProps) {
	const { ssid, permissionStatus } = useWifiSsid()

	const [effectiveServerUrl, setEffectiveServerUrl] = useState<string | null>(null)

	const localProfile = activeServer.localProfile
	const isAutoSwitchEnabled = activeServer.autoSwitchToLocal && localProfile != null

	const evaluateSsidAndSwitchUrl = useCallback(() => {
		const shouldUseLocal =
			isAutoSwitchEnabled && localProfile != null && ssid != null && localProfile.ssid === ssid
		setEffectiveServerUrl(shouldUseLocal ? localProfile.url : activeServer.url)
	}, [ssid, isAutoSwitchEnabled, localProfile, activeServer.url])

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
