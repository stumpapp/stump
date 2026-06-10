import * as Sentry from '@sentry/react-native'
import { GlassView } from 'expo-glass-effect'
import { useRouter } from 'expo-router'
import { X } from 'lucide-react-native'
import { useEffect, useMemo } from 'react'
import { Pressable, View } from 'react-native'
import Animated from 'react-native-reanimated'
import { initialWindowMetrics, useSafeAreaInsets } from 'react-native-safe-area-context'

import {
	ENTERING_ANIMATION,
	EXITING_ANIMATION,
	FADE_IN,
	FADE_OUT,
} from '~/components/book/reader/shared'
import { Text } from '~/components/ui'
import { Icon } from '~/components/ui/icon'
import { usePreferencesStore, useReaderStore } from '~/stores'
import { flattenToc, useEpubLocationStore, useEpubTheme } from '~/stores/epub'

export const HEADER_HEIGHT = 48

export default function ReadiumHeader() {
	const { colors } = useEpubTheme()
	const insets = useSafeAreaInsets()
	const router = useRouter()

	const preferMinimalReader = usePreferencesStore((state) => state.preferMinimalReader)
	const showControls = useReaderStore((state) => state.showControls)
	const { chapterTitle, progressText } = useChapterProgress()

	return (
		<>
			{/* Controls hidden */}
			{!preferMinimalReader && !showControls && (
				<Animated.View
					className="inset-x-safe h-12 px-8 absolute z-20 items-center justify-center"
					style={{ top: initialWindowMetrics?.insets.top || insets.top }}
					entering={ENTERING_ANIMATION}
					exiting={EXITING_ANIMATION}
				>
					<Animated.View key={chapterTitle} entering={FADE_IN} exiting={FADE_OUT}>
						<Text
							numberOfLines={1}
							style={{ color: colors?.foreground }}
							className="font-medium opacity-50"
						>
							{chapterTitle}
						</Text>
					</Animated.View>
				</Animated.View>
			)}

			{/* Controls shown */}
			{showControls && (
				<Animated.View
					className="inset-x-safe h-12 gap-2 px-4 absolute z-20 flex-row items-center justify-between"
					entering={ENTERING_ANIMATION}
					exiting={EXITING_ANIMATION}
					style={[{ top: initialWindowMetrics?.insets.top || insets.top }]}
					pointerEvents={showControls ? undefined : 'none'}
				>
					<GlassView
						className="left-6 absolute items-center justify-center rounded-full"
						isInteractive
					>
						<Pressable disabled={!showControls} onPress={router.back} className="p-3">
							<Icon as={X} size={30} />
						</Pressable>
					</GlassView>

					<View className="flex-1 items-center justify-center">
						<Animated.View entering={FADE_IN} exiting={FADE_OUT}>
							<Text
								numberOfLines={1}
								style={{ color: colors?.foreground }}
								className="font-medium opacity-50"
							>
								{preferMinimalReader ? chapterTitle : progressText}
							</Text>
						</Animated.View>
					</View>
				</Animated.View>
			)}
		</>
	)
}

function useChapterProgress() {
	const chapterTitle = useEpubLocationStore(
		(state) => state.currentChapter || state.book?.name || state.embeddedMetadata?.title,
	)
	const toc = useEpubLocationStore((store) => store.toc)
	const page = useEpubLocationStore((state) => state.position)
	const totalPages = useEpubLocationStore((state) => state.totalPages)
	const enableDebugAnalytics = usePreferencesStore((state) => state.enableDebugAnalytics)

	const pagesLeftInChapterRaw = useMemo(() => {
		const flatToc = flattenToc(toc)
		const activeIndex = flatToc.findIndex((item) => item.label === chapterTitle)

		if (activeIndex === -1 || totalPages <= 0) return null

		const nextChapter = flatToc.slice(activeIndex + 1).find((item) => item.position != null)

		if (activeIndex + 1 === flatToc.length) {
			return totalPages - page
		}

		if (nextChapter?.position != null) {
			return nextChapter.position - 1 - page
		}
		return null
	}, [chapterTitle, toc, page, totalPages])

	const pagesLeftInChapter = useMemo(() => {
		if (pagesLeftInChapterRaw == null) return null
		if (pagesLeftInChapterRaw < 0) return null
		return pagesLeftInChapterRaw
	}, [pagesLeftInChapterRaw])

	useEffect(() => {
		if (!enableDebugAnalytics) return
		if (pagesLeftInChapterRaw == null || pagesLeftInChapterRaw >= 0) return

		const storeSnapshot = useEpubLocationStore.getState()
		Sentry.captureMessage('Encountered negative pages left in chapter', {
			level: 'debug',
			extra: {
				locator: storeSnapshot.locator,
				position: storeSnapshot.position,
				totalPages: storeSnapshot.totalPages,
				chapterTitle: storeSnapshot.currentChapter,
				toc: storeSnapshot.toc,
				flattenedToc: flattenToc(storeSnapshot.toc),
				pagesLeftInChapterRaw,
			},
		})
	}, [enableDebugAnalytics, pagesLeftInChapterRaw])

	const progressText = useMemo(() => {
		if (pagesLeftInChapter == null) return null
		if (pagesLeftInChapter === 0) return 'Final page in chapter'
		else return `${pagesLeftInChapter} pages left in chapter`
	}, [pagesLeftInChapter])

	return { chapterTitle, progressText }
}
