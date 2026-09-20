import { Platform, requireNativeModule } from 'expo-modules-core'

export interface WifiSsidResult {
	ssid: string | null
	/**
	 * Whether the device is connected to a Wi-Fi network.
	 *
	 * Note: When this is `true` and the `ssid` is null, the OS may be withholding
	 * the network name. On Android this happens when location services are off
	 */
	connectedToWifi: boolean
}

interface WifiSsidModuleInterface {
	getSSID(): Promise<WifiSsidResult>
}

const WifiSsidModule = (() => {
	if (Platform.OS !== 'ios' && Platform.OS !== 'android') return null
	try {
		return requireNativeModule<WifiSsidModuleInterface>('WifiSsid')
	} catch {
		return null
	}
})()

/**
 * Get the current WiFi SSID and whether the device is on a Wi-Fi network
 *
 * iOS requirements:
 * - Location permission granted
 * - com.apple.developer.networking.wifi-info entitlement
 *
 * Android requirements:
 * - ACCESS_FINE_LOCATION granted at runtime, and device Location services on
 */
export async function getSSID(): Promise<WifiSsidResult> {
	if (!WifiSsidModule) {
		return { ssid: null, connectedToWifi: false }
	}
	try {
		return WifiSsidModule.getSSID()
	} catch (error) {
		console.error('[WifiSsid] Error getting SSID:', error)
		return { ssid: null, connectedToWifi: false }
	}
}
