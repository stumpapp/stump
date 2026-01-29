import { useSDK } from '@stump/client'
import { useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { Stack, useLocalSearchParams } from 'expo-router'
import { useMemo } from 'react'

import { getProgressionURL } from '~/components/opds/utils'

import { PublicationContext } from './context'

export default function Layout() {
	const { url: publicationURL } = useLocalSearchParams<{ url: string }>()
	const { sdk } = useSDK()

	const { data: publication } = useSuspenseQuery({
		queryKey: [sdk.opds.keys.publication, publicationURL],
		queryFn: () => sdk.opds.publication(publicationURL),
	})
	const progressionURL = useMemo(
		() => getProgressionURL(publication?.links || [], sdk.rootURL),
		[publication, sdk.rootURL],
	)
	const { data: progression, refetch: refetchProgression } = useQuery({
		queryKey: [sdk.opds.keys.progression, progressionURL],
		queryFn: () => sdk.opds.progression(progressionURL || ''),
		enabled: progressionURL != null,
	})

	if (!publication) return null

	return (
		<PublicationContext.Provider
			value={{ publication, url: publicationURL, progression, progressionURL, refetchProgression }}
		>
			<Stack screenOptions={{ headerShown: false }} />
		</PublicationContext.Provider>
	)
}
