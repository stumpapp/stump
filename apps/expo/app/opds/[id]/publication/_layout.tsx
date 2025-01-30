import { useQuery, useSDK } from '@stump/client'
import { Stack, useLocalSearchParams } from 'expo-router'
import { useMemo } from 'react'
import { SafeAreaView } from 'react-native'

import { PublicationContext } from './context'

export default function Layout() {
	const { url: publicationURL } = useLocalSearchParams<{ url: string }>()
	const { sdk } = useSDK()

	const { data: publication } = useQuery(
		[sdk.opds.keys.publication, publicationURL],
		() => sdk.opds.publication(publicationURL),
		{
			suspense: true,
		},
	)
	const progressionURL = useMemo(
		() =>
			publication?.links?.find((link) => link.rel === 'http://www.cantook.com/api/progression')
				?.href,
		[publication],
	)
	const { data: progression } = useQuery(
		[sdk.opds.keys.progression, progressionURL],
		() => sdk.opds.progression(progressionURL || ''),
		{
			suspense: true,
			enabled: false,
		},
	)

	if (!publication) return null

	return (
		<SafeAreaView className="flex-1 bg-background">
			<PublicationContext.Provider value={{ publication, url: publicationURL, progression }}>
				<Stack screenOptions={{ headerShown: false }} />
			</PublicationContext.Provider>
		</SafeAreaView>
	)
}
