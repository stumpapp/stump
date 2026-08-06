import { OPDSFeed } from '@stump/sdk'
import { useNavigation } from 'expo-router'
import { useLayoutEffect, useMemo } from 'react'
import { Platform } from 'react-native'

import { IS_IOS_26_PLUS } from '~/lib/constants'
import { useTranslate } from '~/lib/hooks'

export function useFeedTitle(feed?: OPDSFeed | null) {
	const { t } = useTranslate()
	const title = useMemo(() => (feed ? feed.metadata.title || t('opds.feedTitle') : null), [feed, t])
	const navigation = useNavigation()
	useLayoutEffect(() => {
		if (!title) return
		navigation.setOptions({
			title,
			headerShown: !!title,
			headerTransparent: Platform.OS === 'ios',
			headerLargeTitleStyle: {
				fontSize: 30,
			},
			headerLargeTitle: Platform.OS === 'ios',
			headerBlurEffect: IS_IOS_26_PLUS ? undefined : 'regular',
		})
	}, [navigation, title])
}
