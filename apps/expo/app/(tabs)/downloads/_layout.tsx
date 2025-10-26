import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Stack } from 'expo-router'
import { useRef } from 'react'
import { Platform } from 'react-native'
import { useStore } from 'zustand'

import { DownloadsHeaderMenu, DownloadsHeaderSortMenu } from '~/components/downloads'
import { SelectionLeftScreenHeader } from '~/components/selection'
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
						headerLeft: () =>
							isSelecting ? <SelectionLeftScreenHeader /> : <DownloadsHeaderSortMenu />,
						headerRight: () => (isSelecting ? undefined : <DownloadsHeaderMenu />),
					}}
				/>
			</QueryClientProvider>
		</SelectionContext.Provider>
	)
}
