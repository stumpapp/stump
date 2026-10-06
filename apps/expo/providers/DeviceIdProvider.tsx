import * as Application from 'expo-application'
import { createContext, useContext, useEffect, useState } from 'react'
import { Platform } from 'react-native'

export type DeviceIdContextValue = {
	deviceId?: string | null
}

export const DeviceIdContext = createContext<DeviceIdContextValue>({ deviceId: null })

export function DeviceIdProvider({ children }: React.PropsWithChildren) {
	const [deviceId, setDeviceId] = useState<string | null>(null)

	useEffect(() => {
		async function getDeviceId() {
			if (Platform.OS === 'ios') {
				setDeviceId(await Application.getIosIdForVendorAsync())
			} else {
				setDeviceId(Application.getAndroidId())
			}
		}
		getDeviceId()
	}, [])

	return <DeviceIdContext.Provider value={{ deviceId }}>{children}</DeviceIdContext.Provider>
}

export function useDeviceId() {
	const context = useContext(DeviceIdContext)
	return context.deviceId
}
