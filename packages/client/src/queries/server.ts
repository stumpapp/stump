import { useQuery } from '@tanstack/react-query'

import { useSDK } from '../sdk'

export function useStumpVersion() {
	const { sdk } = useSDK()
	const { data: version } = useQuery({
		queryKey: [sdk.server.keys.version],
		queryFn: () => sdk.server.version(),
	})

	return version
}

export function useCheckForServerUpdate() {
	const { sdk } = useSDK()
	const { data, isLoading } = useQuery({
		queryKey: [sdk.server.keys.checkUpdate],
		queryFn: () => sdk.server.checkUpdate(),
	})

	return {
		isLoading,
		updateAvailable: data?.hasUpdateAvailable ?? false,
	}
}
