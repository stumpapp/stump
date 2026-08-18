import Location, { PermissionStatus } from 'expo-location'
import type React from 'react'
import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
} from 'react'

import { getSSID } from '~/modules/wifi-ssid'

export type UseWifiSSIDReturn = {
	ssid: string | null
	connectedToWifi: boolean
	permissionStatus: PermissionStatus
	requestPermission: () => Promise<boolean>
	isLoading: boolean
}

const WifiSsidContext = createContext<UseWifiSSIDReturn | null>(null)

const POLL_INTERVAL_MS = 10_000

type Props = {
	children: ReactNode
}

/**
 * a provider to inject the wifi ssid context into the component tree so servers,
 * downstream, can use the ssid to determine which configuration to use (local vs remote)
 */
export function WifiSsidProvider({ children }: Props): React.ReactElement {
	const [ssid, setSSID] = useState<string | null>(null)
	const [connectedToWifi, setConnectedToWifi] = useState(false)
	const [permissionStatus, setPermissionStatus] = useState<PermissionStatus>(
		PermissionStatus.UNDETERMINED,
	)
	const [isLoading, setIsLoading] = useState(true)

	const fetchSSID = useCallback(async () => {
		const result = await getSSID()
		setSSID(result.ssid)
		setConnectedToWifi(result.connectedToWifi)
	}, [])

	const requestPermission = useCallback(async () => {
		try {
			const { status } = await Location.requestForegroundPermissionsAsync()
			setPermissionStatus(status)
			return status === PermissionStatus.GRANTED
		} catch {
			setPermissionStatus(PermissionStatus.UNDETERMINED)
			return false
		}
	}, [])

	// check the location permission once on mount
	useEffect(() => {
		let cancelled = false
		async function initialize() {
			setIsLoading(true)
			try {
				const { status } = await Location.getForegroundPermissionsAsync()
				if (cancelled) return
				setPermissionStatus(status)
			} catch {
				if (!cancelled) setPermissionStatus(PermissionStatus.UNDETERMINED)
			}
			if (!cancelled) setIsLoading(false)
		}

		initialize()
		return () => {
			cancelled = true
		}
	}, [])

	// fetch the ssid immediately, then poll, whenever permission is granted
	useEffect(() => {
		if (permissionStatus !== PermissionStatus.GRANTED) return
		fetchSSID()
		const interval = setInterval(fetchSSID, POLL_INTERVAL_MS)
		return () => clearInterval(interval)
	}, [permissionStatus, fetchSSID])

	const value = useMemo(
		() => ({
			ssid,
			connectedToWifi,
			permissionStatus,
			requestPermission,
			isLoading,
		}),
		[ssid, connectedToWifi, permissionStatus, requestPermission, isLoading],
	)

	return <WifiSsidContext.Provider value={value}>{children}</WifiSsidContext.Provider>
}

export function useWifiSsid(): UseWifiSSIDReturn {
	const context = useContext(WifiSsidContext)
	if (!context) {
		throw new Error('useWifiSsid must be used within WifiSsidProvider')
	}
	return context
}
