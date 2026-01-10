import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Stack, useNavigation } from 'expo-router'
import { useLayoutEffect, useMemo, useRef } from 'react'
import { Platform, View } from 'react-native'
import { useStore } from 'zustand'

import { DownloadsHeaderMenu, DownloadsHeaderSortMenu } from '~/components/downloads'
import { SelectionLeftScreenHeader, SelectionRightScreenHeader } from '~/components/selection'
import { IS_IOS_24_PLUS } from '~/lib/constants'
import { usePreferencesStore } from '~/stores'
import { createSelectionStore, SelectionContext, SelectionStore } from '~/stores/selection'

const offlineQueryClient = new QueryClient({
	defaultOptions: {
		queries: {
			retry: false,
			throwOnError: false,
		},
	},
})

function AndroidHeaderWrapper({
	children,
	store,
}: React.PropsWithChildren<{ store: SelectionStore }>) {
	return (
		<SelectionContext.Provider value={store}>
			<QueryClientProvider client={offlineQueryClient}>{children}</QueryClientProvider>
		</SelectionContext.Provider>
	)
}

export default function Screen() {
	const animationEnabled = usePreferencesStore((state) => !state.reduceAnimations)

	const store = useRef(createSelectionStore()).current

	const isSelecting = useStore(store, (state) => state.isSelecting)

	const androidHeaderLeft = useMemo(
		() => (
			<AndroidHeaderWrapper store={store}>
				{isSelecting ? (
					<SelectionLeftScreenHeader key="selection-left" />
				) : (
					<DownloadsHeaderSortMenu key="sort-menu" />
				)}
			</AndroidHeaderWrapper>
		),
		[isSelecting, store],
	)

	const androidHeaderRight = useMemo(
		() => (
			<AndroidHeaderWrapper store={store}>
				<View className="mr-2">
					{isSelecting ? (
						<SelectionRightScreenHeader key="selection-right" />
					) : (
						<DownloadsHeaderMenu key="header-menu" />
					)}
				</View>
			</AndroidHeaderWrapper>
		),
		[isSelecting, store],
	)

	const navigation = useNavigation()
	useLayoutEffect(() => {
		if (Platform.OS === 'android') {
			navigation.setOptions({
				headerLeft: () => androidHeaderLeft,
				headerRight: () => androidHeaderRight,
			})
		}
	}, [navigation, androidHeaderLeft, androidHeaderRight])

	return (
		<SelectionContext.Provider value={store}>
			<QueryClientProvider client={offlineQueryClient}>
				<Stack
					screenOptions={{
						title: 'Downloads',
						headerShown: Platform.OS === 'ios',
						headerTransparent: Platform.OS === 'ios',
						headerLargeTitle: true,
						headerBlurEffect: IS_IOS_24_PLUS ? undefined : 'regular',
						animation: animationEnabled ? 'default' : 'none',
						headerLargeTitleStyle: {
							fontSize: 30,
						},
						headerLeft:
							Platform.OS === 'ios'
								? () => (isSelecting ? <SelectionLeftScreenHeader /> : <DownloadsHeaderSortMenu />)
								: undefined,
						headerRight:
							Platform.OS === 'ios'
								? () => (isSelecting ? <SelectionRightScreenHeader /> : <DownloadsHeaderMenu />)
								: undefined,
						// TODO: Check in on unstable_headerRightItems once available
					}}
				/>
			</QueryClientProvider>
		</SelectionContext.Provider>
	)
}
