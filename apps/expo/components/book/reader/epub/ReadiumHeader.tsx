import { useRouter } from 'expo-router'
import { ALargeSmall, Ellipsis, TableOfContents } from 'lucide-react-native'
import { useEffect } from 'react'
import { Platform, Pressable, View } from 'react-native'
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import ChevronBackLink from '~/components/ChevronBackLink'
import { Text } from '~/components/ui'
import { Icon } from '~/components/ui/icon'
import { useDisplay } from '~/lib/hooks'
import { useReaderStore } from '~/stores'
import { useEpubLocationStore, useEpubTheme } from '~/stores/epub'

export const HEADER_HEIGHT = 48

type Props = {
	settingsUrl: string
	locationsUrl?: string
}

export default function ReadiumHeader({ settingsUrl, locationsUrl }: Props) {
	const { height } = useDisplay()

	const visible = useReaderStore((state) => state.showControls)
	const chapterTitle = useEpubLocationStore(
		(state) => state.currentChapter || state.book?.name || state.embeddedMetadata?.title,
	)

	const { colors } = useEpubTheme()

	const insets = useSafeAreaInsets()

	const translateY = useSharedValue(-400)
	useEffect(() => {
		translateY.value = withTiming(visible ? 0 : 400 * -1, {
			duration: 300,
		})
	}, [visible, translateY, height, insets.top])

	const animatedStyles = useAnimatedStyle(() => {
		return {
			top: insets.top + (Platform.OS === 'android' ? 0 : 0),
			left: insets.left,
			right: insets.right,
			transform: [{ translateY: translateY.value }],
		}
	})

	const router = useRouter()

	return (
		<Animated.View
			className="absolute z-20 h-12 flex-row items-center justify-between gap-2 px-2"
			style={animatedStyles}
		>
			<View className="flex-1 flex-row items-center gap-4">
				<ChevronBackLink style={{ color: colors?.foreground, opacity: 0.9 }} />
				{locationsUrl && (
					<Pressable
						onPress={() =>
							// @ts-expect-error: String path
							router.push(locationsUrl)
						}
					>
						{({ pressed }) => (
							<Icon
								as={TableOfContents}
								className="h-6 w-6"
								// @ts-expect-error: Color definitely works
								style={{ opacity: pressed ? 0.7 : 0.9, color: colors?.foreground }}
							/>
						)}
					</Pressable>
				)}
			</View>

			<View className="absolute left-0 right-0 items-center justify-center px-16">
				<Text numberOfLines={1} style={{ color: colors?.foreground }} className="max-w-[90%]">
					{chapterTitle}
				</Text>
			</View>

			<View className="flex-1 flex-row items-center justify-end gap-4">
				<Pressable
					onPress={() =>
						// @ts-expect-error: String path
						router.push(settingsUrl)
					}
				>
					{({ pressed }) => (
						<Icon
							as={ALargeSmall}
							className="h-6 w-6"
							// @ts-expect-error: Color definitely works
							style={{ opacity: pressed ? 0.7 : 0.9, color: colors?.foreground }}
						/>
					)}
				</Pressable>

				<Pressable>
					{({ pressed }) => (
						<Icon
							as={Ellipsis}
							className="h-6 w-6"
							// @ts-expect-error: Color definitely works
							style={{ opacity: pressed ? 0.7 : 0.9, color: colors?.foreground }}
						/>
					)}
				</Pressable>
			</View>
		</Animated.View>
	)
}
