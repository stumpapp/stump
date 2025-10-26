import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Stack, useNavigation } from 'expo-router'
import { useLayoutEffect, useRef } from 'react'
import { Platform, View } from 'react-native'
import { useStore } from 'zustand'

import { DownloadsHeaderMenu, DownloadsHeaderSortMenu } from '~/components/downloads'
import { SelectionLeftScreenHeader, SelectionRightScreenHeader } from '~/components/selection'
import { IS_IOS_24_PLUS } from '~/lib/constants'
import { usePreferencesStore } from '~/stores'
import { createSelectionStore, SelectionContext } from '~/stores/selection'

const offlineQueryClient = new QueryClient({
	defaultOptions: {
		queries: {
			retry: false,
			throwOnError: false,
		},
	},
})

export default function Screen() {
	const animationEnabled = usePreferencesStore((state) => !state.reduceAnimations)

	const store = useRef(createSelectionStore()).current

	const isSelecting = useStore(store, (state) => state.isSelecting)

	const navigation = useNavigation()
	useLayoutEffect(
		() => {
			if (Platform.OS === 'android') {
				const WithProvider = ({ children }: { children: React.ReactNode }) => (
					<SelectionContext.Provider value={store}>
						<QueryClientProvider client={offlineQueryClient}>{children}</QueryClientProvider>
					</SelectionContext.Provider>
				)

				navigation.setOptions({
					headerLeft: () => (
						<WithProvider>
							{isSelecting ? <SelectionLeftScreenHeader /> : <DownloadsHeaderSortMenu />}
						</WithProvider>
					),
					headerRight: () => (
						<WithProvider>
							<View className="mr-2">
								{isSelecting ? <SelectionRightScreenHeader /> : <DownloadsHeaderMenu />}
							</View>
						</WithProvider>
					),
				})
			}
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[isSelecting, navigation],
	)

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
