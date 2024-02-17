import { serverApi, serverQueryKeys } from '@stump/api'

import { useQuery } from '../client'

export function useStumpVersion() {
	const { data: version } = useQuery(
		['stumpVersion'],
		async () => {
			const { data } = await serverApi.getStumpVersion()
			return data
		},
		{
			onError(err) {
				console.error('Failed to fetch Stump API version:', err)
			},
		},
	)

	return version
}

export function useCheckForServerUpdate() {
	const { data, isLoading } = useQuery([serverQueryKeys.checkForServerUpdate], async () => {
		const { data } = await serverApi.checkForServerUpdate()
		return data
	})

	return {
		isLoading,
		updateAvailable: data?.has_update_available ?? false,
	}
}
