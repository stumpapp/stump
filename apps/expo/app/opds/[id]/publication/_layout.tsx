import { useQuery, useSDK } from '@stump/client'
import { Stack, useLocalSearchParams } from 'expo-router'
import { SafeAreaView } from 'react-native'

import { PublicationContext } from './context'

export default function Layout() {
	const { url: bookURL } = useLocalSearchParams<{ url: string }>()
	const { sdk } = useSDK()

	const { data: publication } = useQuery(
		[sdk.opds.keys.publication, bookURL],
		() => sdk.opds.publication(bookURL),
		{
			suspense: true,
		},
	)

	if (!publication) return null

	return (
		<SafeAreaView className="flex-1 bg-background">
			<PublicationContext.Provider value={{ publication }}>
				<Stack screenOptions={{ headerShown: false }} />
			</PublicationContext.Provider>
		</SafeAreaView>
	)
}
