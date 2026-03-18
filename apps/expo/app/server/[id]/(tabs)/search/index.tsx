import { useSDK } from '@stump/client'
import { useQueryClient } from '@tanstack/react-query'
import { useNavigation, useRouter } from 'expo-router'
import debounce from 'lodash/debounce'
import { useCallback, useLayoutEffect, useMemo, useState } from 'react'
import { Platform, TextInputChangeEventData, View } from 'react-native'
import { NativeSyntheticEvent } from 'react-native'

import { useActiveServer } from '~/components/activeServer'
import Owl from '~/components/Owl'
import { SearchHistoryAndFavorites } from '~/components/search/SearchHistoryAndFavorites'
import { Text } from '~/components/ui'
import { IS_IOS_24_PLUS, useColors } from '~/lib/constants'
import { useSearchStore } from '~/stores/search'

import { prefetchBookSearch } from '../../books/search[q]'

export default function Screen() {
	const {
		activeServer: { id: serverID },
	} = useActiveServer()
	const { sdk } = useSDK()
	const trackSearch = useSearchStore((store) => store.trackSearch)

	const client = useQueryClient()
	const navigation = useNavigation()
	const router = useRouter()

	const [searchQuery, setSearchQuery] = useState('')
	const [isInputFocused, setIsInputFocused] = useState(false)

	const onSearchChange = useCallback(
		(query: string) => {
			prefetchBookSearch(sdk, client, query)
			setSearchQuery(query)
		},
		[sdk, client],
	)
	const setQuery = useMemo(() => debounce(onSearchChange, 200), [onSearchChange])
	const colors = useColors()

	const navigateToQuery = useCallback(
		(query: string) => {
			trackSearch(query, serverID)
			router.push({
				pathname: `/server/[id]/search/[query]`,
				params: { id: serverID, query },
			})
		},
		[serverID, router, trackSearch],
	)

	const onSearch = useCallback(() => {
		if (!searchQuery) return
		navigateToQuery(searchQuery)
	}, [searchQuery, navigateToQuery])

	useLayoutEffect(() => {
		navigation.setOptions({
			headerShown: true,
			headerTransparent: Platform.OS === 'ios',
			headerBlurEffect: IS_IOS_24_PLUS ? undefined : 'regular',
			headerSearchBarOptions: {
				placeholder: 'Search',
				onChangeText: (e: NativeSyntheticEvent<TextInputChangeEventData>) =>
					setQuery(e.nativeEvent.text),
				shouldShowHintSearchIcon: true,
				onSearchButtonPress: () => onSearch(),
				onFocus: () => setIsInputFocused(true),
				onBlur: () => setIsInputFocused(false),
				onCancelButtonPress: () => setIsInputFocused(false),
				headerIconColor: colors.foreground.subtle,
				hintTextColor: colors.foreground.muted,
				tintColor: colors.fill.danger.DEFAULT,
				textColor: colors.foreground.DEFAULT,
			},
		})
	}, [navigation, setQuery, onSearch, colors])

	if (!isInputFocused) {
		return (
			<View className="flex-1 items-center justify-center gap-4 bg-background p-4 tablet:p-7">
				<Owl owl="search" />
				<View className="gap-2 px-4 tablet:max-w-lg">
					<Text size="xl" className="text-center font-semibold leading-tight">
						Search the server
					</Text>
					<Text size="lg" className="text-center text-foreground-muted">
						Enter a search query to find content on this server
					</Text>
				</View>
			</View>
		)
	}

	return <SearchHistoryAndFavorites onSelect={navigateToQuery} />
}
