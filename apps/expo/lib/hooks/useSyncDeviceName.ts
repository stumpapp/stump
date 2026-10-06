import { useGraphQLMutation } from '@stump/client'
import { graphql } from '@stump/graphql'
import { useEffect, useRef } from 'react'

import { useDeviceId } from '~/providers/DeviceIdProvider'
import { usePreferencesStore } from '~/stores'

const mutation = graphql(`
	mutation UseSyncDeviceName($deviceId: String!, $deviceName: String!) {
		upsertReadingDevice(id: $deviceId, name: $deviceName) {
			id
			name
		}
	}
`)

// This hook will attempt to upsert the device name on the server on mount / whenever
// name changes. It isn't worth the hassle to try to handle "name hasn't changed across
// sessions so don't try upsert" so it's fine
export function useSyncDeviceName() {
	const deviceName = usePreferencesStore((state) => state.deviceName)
	const deviceId = useDeviceId()

	const didSync = useRef(false)

	const { mutate, isPending } = useGraphQLMutation(mutation, {
		onSuccess: () => (didSync.current = true),
		throwOnError: false,
	})

	useEffect(() => {
		if (!deviceName || !deviceId || didSync.current || isPending) return
		mutate({ deviceId, deviceName })
	}, [deviceName, deviceId, mutate, isPending])
}
