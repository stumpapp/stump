import { OPDSFeed } from '@stump/sdk'
import { useNavigation } from 'expo-router'
import { useLayoutEffect, useMemo } from 'react'
import { Platform } from 'react-native'

import { IS_IOS_24_PLUS } from '~/lib/constants'

export function useFeedTitle(feed: OPDSFeed) {
	const title = useMemo(() => feed.metadata.title || 'OPDS Feed', [feed.metadata.title])
	const navigation = useNavigation()
	useLayoutEffect(() => {
		navigation.setOptions({
			title,
			headerShown: !!title,
			headerTransparent: Platform.OS === 'ios',
			// TODO: Can't decide if I like the large header or not
			headerLargeTitleStyle: {
				fontSize: 30,
			},
			headerLargeTitle: Platform.OS === 'ios',
			headerBlurEffect: IS_IOS_24_PLUS ? undefined : 'regular',
		})
	}, [navigation, title])
}
