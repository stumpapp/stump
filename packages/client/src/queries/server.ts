import { useSDK } from '@/sdk'

import { useQuery } from '../client'

export function useStumpVersion() {
	const { sdk } = useSDK()
	const { data: version } = useQuery([sdk.server.keys.version], sdk.server.version, {
		onError(err) {
			console.error('Failed to fetch Stump API version:', err)
		},
	})

	return version
}

export function useCheckForServerUpdate() {
	const { sdk } = useSDK()
	const { data, isLoading } = useQuery([sdk.server.keys.checkUpdate], sdk.server.checkUpdate)

	return {
		isLoading,
		updateAvailable: data?.has_update_available ?? false,
	}
}
