import { useSDK } from '@stump/client'
import { useQueryClient } from '@tanstack/react-query'
import { useNavigation, useRouter } from 'expo-router'
import debounce from 'lodash/debounce'
import { Search } from 'lucide-react-native'
import { useCallback, useLayoutEffect, useState } from 'react'
import { Platform, TextInputChangeEventData, View } from 'react-native'
import { NativeSyntheticEvent } from 'react-native'

import { useActiveServer } from '~/components/activeServer'
import { Text } from '~/components/ui'
import { useColors } from '~/lib/constants'

import { prefetchBookSearch } from '../../books/search[q]'

// TODO: Put in a stack and push for search

export default function Screen() {
	const {
		activeServer: { id: serverID },
	} = useActiveServer()
	const { sdk } = useSDK()

	const client = useQueryClient()
	const navigation = useNavigation()
	const router = useRouter()

	const [searchQuery, setSearchQuery] = useState('')

	const onSearchChange = useCallback(
		(query: string) => {
			prefetchBookSearch(sdk, client, query)
			// prefetchSeriesSearch(sdk, client, searchQuery)
			// prefetchLibrarySearch(sdk, client, searchQuery)
			setSearchQuery(query)
		},
		[sdk, client],
	)
	const setQuery = debounce(onSearchChange, 200)
	const colors = useColors()

	const onSearch = useCallback(() => {
		if (!searchQuery) return

		router.push({
			pathname: `/server/[id]/search/[query]`,
			params: {
				id: serverID,
				query: searchQuery,
			},
		})
	}, [serverID, router, searchQuery])

	useLayoutEffect(() => {
		navigation.setOptions({
			headerShown: true,
			headerTransparent: Platform.OS === 'ios',
			headerBlurEffect: 'regular',
			headerSearchBarOptions: {
				placeholder: 'Search',
				onChangeText: (e: NativeSyntheticEvent<TextInputChangeEventData>) =>
					setQuery(e.nativeEvent.text),
				shouldShowHintSearchIcon: true,
				onSearchButtonPress: () => onSearch(),
				headerIconColor: colors.foreground.subtle,
				hintTextColor: colors.foreground.muted,
				tintColor: colors.fill.danger.DEFAULT,
				textColor: colors.foreground.DEFAULT,
			},
		})
	}, [navigation, setQuery, onSearch, colors])

	return (
		<View className="flex-1 items-center justify-center gap-4 bg-background p-4 tablet:p-7">
			<Search className="h-8 w-8 text-foreground-muted" />

			<View>
				<Text className="text-foreground-muted">Enter a search query to get started</Text>
			</View>
		</View>
	)
}
