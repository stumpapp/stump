import { TrueSheet } from '@lodev09/react-native-true-sheet'
import { usePathname } from 'expo-router'
import { Href } from 'expo-router'
import { Download } from 'lucide-react-native'
import { useCallback, useRef } from 'react'
import { Platform, Pressable, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { useColors } from '~/lib/constants'
import { useDownloadQueueCounts } from '~/lib/hooks'
import { cn } from '~/lib/utils'

import { Icon } from '../ui/icon'
import { Text } from '../ui/text'
import { DownloadQueueSheet } from './DownloadQueueSheet'

export function FloatingQueueButton() {
	const path = usePathname()
	const insets = useSafeAreaInsets()
	const sheetRef = useRef<TrueSheet>(null)
	const colors = useColors()

	const counts = useDownloadQueueCounts()
	const activeQueueCount = counts.activeQueue

	const isTabScreen = useIsTabScreen()

	const handlePress = useCallback(() => {
		sheetRef.current?.present()
	}, [])

	// FIXME: This is a visual estimation, ideally we would actually measure the tab bar height. That isn't possible
	// at the time of writing for the native tabs: https://docs.expo.dev/router/advanced/native-tabs/#cannot-measure-the-tab-bar-height
	// Honestly, though, I think for iOS it might make sense to use a toolbar? https://developer.apple.com/design/human-interface-guidelines/toolbars
	// Pretty sure expo 55 will have an alpha lib for that? This also won't account for scroll interactions with the tabbar, like
	// how on ios it will collapse into a smaller bar when scrolling down. For now its fine, this isn't a UI element
	// that is super fixed so
	const bottomOffset = insets.bottom + getOffset(isTabScreen)

	const shouldHide = path.includes('/read')
	if (shouldHide) {
		return null
	}

	const isCentered = FIXED_TAB_PATHS.some((tabPath) => path === tabPath)

	return (
		<>
			{activeQueueCount > 0 && (
				<Pressable
					onPress={handlePress}
					// Note: I put it on the left because of how iOS collapse works, it just looked funky in the center or on the right above a search
					// so left was where I landed. Ofc, this looks terrible when in home stack lol so it will be centered there
					className={cn(
						'absolute left-6 z-50 flex-row items-center gap-2.5 rounded-full px-4 py-3 shadow active:opacity-90',
						{
							'left-[unset] self-center': isCentered,
						},
					)}
					style={[
						{
							backgroundColor: colors.fill.brand.DEFAULT,
							bottom: bottomOffset,
						},
					]}
				>
					<Icon as={Download} size={20} className="text-white" />
					<View className="min-w-[20px] items-center justify-center rounded-full bg-white/20 px-2 py-0.5">
						<Text className="text font-bold text-white">{activeQueueCount}</Text>
					</View>
				</Pressable>
			)}

			<DownloadQueueSheet ref={sheetRef} />
		</>
	)
}

const FIXED_TAB_PATHS: Href[] = [
	// @ts-expect-error: This doesn't appear in the Href type but I've def encountered / during runtime so
	'/',
	'/index',
	'/library',
	'/settings',
	'/settings/reader',
]
const DYNAMIC_TAB_PATHS = [
	/^\/server\/[^/]+\/?$/,
	/^\/server\/[^/]+\/(index|browse)\/?$/,
	/^\/opds\/[^/]+\/?$/,
]

function useIsTabScreen() {
	const path = usePathname()

	const isTabScreen = Boolean(
		FIXED_TAB_PATHS.some((tabPath) => path === tabPath) ||
		DYNAMIC_TAB_PATHS.some((tabPath) => {
			if (tabPath.test(path)) return true
		}),
	)

	return isTabScreen
}

function getOffset(isTabScreen: boolean) {
	switch (Platform.OS) {
		case 'ios': {
			if (Platform.isPad) {
				return 30
			}
			return isTabScreen ? 60 : 30
		}
		case 'android':
			return 60
		default:
			return 30
	}
}
