import { useSDK } from '@stump/client'
import { useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { Stack, useGlobalSearchParams } from 'expo-router'
import { useMemo } from 'react'
import { Platform } from 'react-native'

import ChevronBackLink from '~/components/ChevronBackLink'
import { getProgressionURL } from '~/components/opds/utils'
import { IS_IOS_24_PLUS } from '~/lib/constants'

import { PublicationContext } from './context'

export default function Layout() {
	const { url: publicationURL } = useGlobalSearchParams<{ url: string }>()
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
			<Stack screenOptions={{ headerShown: false }}>
				<Stack.Screen
					name="index"
					options={{
						headerTitle: '',
						headerShown: true,
						headerTransparent: true,
						headerBlurEffect: IS_IOS_24_PLUS ? undefined : 'regular',
						headerLeft: Platform.OS === 'ios' ? () => <ChevronBackLink /> : undefined,
					}}
				/>
			</Stack>
		</PublicationContext.Provider>
	)
}
