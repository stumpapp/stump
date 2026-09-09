import { queryClient } from '@stump/client'
import { Api } from '@stump/sdk'
import {
	createContext,
	Dispatch,
	SetStateAction,
	useCallback,
	useContext,
	useEffect,
	useRef,
	useState,
} from 'react'
import { useDebounce } from 'rooks'

import { SavedServer } from '~/stores/savedServer'

import { useWifiSsid } from './WifiSsidProvider'

export type IActiveServerContext = {
	activeServer: SavedServer
	effectiveServerUrl: string
}

export const ActiveServerContext = createContext<IActiveServerContext | undefined>(undefined)

type ActiveServerProviderProps = {
	children: React.ReactNode
	activeServer: SavedServer
}

export function ActiveServerProvider({ children, activeServer }: ActiveServerProviderProps) {
	const { ssid, permissionStatus, isLoading } = useWifiSsid()

	const localProfile = activeServer.localProfile
	const isAutoSwitchEnabled = activeServer.autoSwitchToLocal && localProfile != null

	const [effectiveServerUrl, setEffectiveServerUrl] = useState<string | null>(
		// if auto-switch is disabled there is no point in waiting for ssid eval
		isAutoSwitchEnabled ? null : activeServer.url,
	)

	const evaluateSsidAndSwitchUrl = useCallback(() => {
		const shouldUseLocal =
			isAutoSwitchEnabled && localProfile != null && ssid != null && localProfile.ssid === ssid
		setEffectiveServerUrl(shouldUseLocal ? localProfile.url : activeServer.url)
	}, [ssid, isAutoSwitchEnabled, localProfile, activeServer.url])

	const debouncedEvaluateSsidAndSwitchUrl = useDebounce(evaluateSsidAndSwitchUrl, 500)

	const hasEvaluatedOnce = useRef(false)
	const lastSsid = useRef<string | null>(null)

	useEffect(() => {
		if (!isAutoSwitchEnabled || isLoading) return

		// if enabled but lacking permission, no point evaluating
		if (permissionStatus !== 'granted') {
			setEffectiveServerUrl(activeServer.url)
			return
		}

		// no change since last eval = no subsequent eval
		if (hasEvaluatedOnce.current && ssid === lastSsid.current) return

		lastSsid.current = ssid

		if (!hasEvaluatedOnce.current) {
			hasEvaluatedOnce.current = true
			evaluateSsidAndSwitchUrl() // no debounce on first eval, switch asap
		} else {
			debouncedEvaluateSsidAndSwitchUrl()
		}
	}, [
		isAutoSwitchEnabled,
		isLoading,
		permissionStatus,
		ssid,
		evaluateSsidAndSwitchUrl,
		debouncedEvaluateSsidAndSwitchUrl,
		activeServer.url,
	])

	if (effectiveServerUrl === null) {
		return null
	}

	return (
		<ActiveServerContext.Provider
			value={{
				activeServer,
				effectiveServerUrl,
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

export const useServerUrl = () => {
	const { effectiveServerUrl } = useActiveServer()
	return effectiveServerUrl
}

/**
 * Safe variant of useActiveServer that returns undefined if there's no active server
 * Pretty much just used for features that persist across servers (e.g., downloads)
 */
export const useActiveServerSafe = () => useContext(ActiveServerContext)

type UseUrlSwitchParams = {
	url: string
	setSDK: Dispatch<SetStateAction<Api | null>>
}

/**
 * watches `url` for changes after the initial render and, when it changes,
 * cancels any active react-query requests and calls `sdk.switchUrl` so the
 * existing instance is re-pointed at the new url
 */
export function useUrlSwitch({ url, setSDK }: UseUrlSwitchParams) {
	const previousUrl = useRef(url)

	useEffect(() => {
		if (previousUrl.current === url) return
		previousUrl.current = url
		queryClient.cancelQueries()
		setSDK((curr) => {
			curr?.switchUrl(url)
			return curr
		})
	}, [url, setSDK])
}
