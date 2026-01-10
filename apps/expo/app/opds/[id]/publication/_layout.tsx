import { useSDK } from '@stump/client'
import { useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { Stack, useLocalSearchParams } from 'expo-router'
import { useMemo } from 'react'

import { PublicationContext } from './context'

export default function Layout() {
	const { url: publicationURL } = useLocalSearchParams<{ url: string }>()
	const { sdk } = useSDK()

	const { data: publication } = useSuspenseQuery({
		queryKey: [sdk.opds.keys.publication, publicationURL],
		queryFn: () => sdk.opds.publication(publicationURL),
	})
	const progressionURL = useMemo(
		() =>
			publication?.links?.find((link) => link.rel === 'http://www.cantook.com/api/progression')
				?.href,
		[publication],
	)
	const { data: progression } = useQuery({
		queryKey: [sdk.opds.keys.progression, progressionURL],
		queryFn: () => sdk.opds.progression(progressionURL || ''),
		enabled: false,
	})

	if (!publication) return null

	return (
		<PublicationContext.Provider value={{ publication, url: publicationURL, progression }}>
			<Stack screenOptions={{ headerShown: false }} />
		</PublicationContext.Provider>
	)
}
