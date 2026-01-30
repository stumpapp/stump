import { ALargeSmall, TableOfContents } from 'lucide-react-native'
import { useEffect } from 'react'
import { Pressable, View } from 'react-native'
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated'
import { initialWindowMetrics, useSafeAreaInsets } from 'react-native-safe-area-context'

import ChevronBackLink from '~/components/ChevronBackLink'
import { Text } from '~/components/ui'
import { Icon } from '~/components/ui/icon'
import { CONTROLS_TIMING_CONFIG } from '~/lib/constants'
import { useDisplay } from '~/lib/hooks'
import { useReaderStore } from '~/stores'
import { flattenToc, useEpubLocationStore, useEpubTheme } from '~/stores/epub'
import { useEpubSheetStore } from '~/stores/epubSheet'

import BookmarkButton from './BookmarkButton'

export const HEADER_HEIGHT = 48

// TODO: Figure out ideal UI for reader, I have largely been influenced by Yomu but
// think I want to deviate a bit moving forward

export default function ReadiumHeader() {
	const { height } = useDisplay()

	const openSheet = useEpubSheetStore((state) => state.openSheet)

	const visible = useReaderStore((state) => state.showControls)
	const chapterTitle = useEpubLocationStore(
		(state) => state.currentChapter || state.book?.name || state.embeddedMetadata?.title,
	)
	const position = useEpubLocationStore((state) => state.position)
	const toc = useEpubLocationStore((state) => state.toc)

	const flatToc = flattenToc(toc)

	// for cases where we have chapter2_1.xhtml, chapter2_insert.xhtml, chapter2_2.xhtml in the spine but only
	// chapter2_1.xhtml is mentioned in the toc, we can try to find the toc item based on the current position
	const chapterItem = flatToc.find((item, index) => {
		const nextItem = flatToc[index + 1]
		if (item.position) {
			const isAfterChapterStart = position >= item.position
			const isBeforeChapterEnd = nextItem?.position ? position < nextItem?.position : true
			return isAfterChapterStart && isBeforeChapterEnd
		}
	})

	const { colors } = useEpubTheme()

	const insets = useSafeAreaInsets()

	const opacity = useSharedValue(0)
	useEffect(() => {
		opacity.value = withTiming(visible ? 1 : 0, CONTROLS_TIMING_CONFIG)
	}, [visible, opacity, height, insets.top])

	const animatedStyles = useAnimatedStyle(() => {
		return {
			top: initialWindowMetrics?.insets.top || insets.top,
			left: insets.left,
			right: insets.right,
			opacity: opacity.value,
		}
	})

	return (
		<Animated.View
			className="absolute z-20 h-12 flex-row items-center justify-between gap-2 px-2"
			style={animatedStyles}
		>
			<View className="flex-1 flex-row items-center gap-4">
				<ChevronBackLink style={{ color: colors?.foreground, opacity: 0.9 }} />
				<Pressable onPress={() => openSheet('locations')}>
					{({ pressed }) => (
						<Icon
							as={TableOfContents}
							className="h-6 w-6"
							// @ts-expect-error: Color definitely works
							style={{ opacity: pressed ? 0.7 : 0.9, color: colors?.foreground }}
						/>
					)}
				</Pressable>
			</View>

			<View className="absolute left-0 right-0 items-center justify-center px-16">
				<Text numberOfLines={1} style={{ color: colors?.foreground }} className="max-w-[90%]">
					{chapterItem?.label || chapterTitle}
				</Text>
			</View>

			<View className="flex-1 flex-row items-center justify-end gap-4">
				<BookmarkButton color={colors?.foreground} />

				<Pressable onPress={() => openSheet('settings')}>
					{({ pressed }) => (
						<Icon
							as={ALargeSmall}
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
