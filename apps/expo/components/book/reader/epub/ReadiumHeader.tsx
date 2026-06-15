import * as Sentry from '@sentry/react-native'
import { GlassView } from 'expo-glass-effect'
import { useRouter } from 'expo-router'
import { ArrowLeft, X } from 'lucide-react-native'
import { useEffect, useMemo } from 'react'
import { Platform, Pressable, View } from 'react-native'
import Animated from 'react-native-reanimated'

import {
	ENTERING_ANIMATION,
	EXITING_ANIMATION,
	FADE_IN,
	FADE_OUT,
	useReaderAnimations,
} from '~/components/book/reader/shared'
import { Text } from '~/components/ui'
import { Icon } from '~/components/ui/icon'
import { IS_IOS_26_PLUS } from '~/lib/constants'
import { cn } from '~/lib/utils'
import { usePreferencesStore, useReaderStore } from '~/stores'
import { flattenToc, useEpubLocationStore, useEpubTheme } from '~/stores/epub'

import { useButtonColors } from './MenuItem'
import { BUTTON_SIZE, ICON_SCALE } from './ReadiumFooter'

// size normalisation factor to make the icons feel the same size:
// - X: smaller than expected -> 1.2x seems good
// - ArrowLeft: Menu is wider than ArrowLeft, so it's closer to the circle's edge, so ArrowLeft looks smaller -> 1.2x seems good (coincidence)
const ICON_SIZE = BUTTON_SIZE * (Platform.OS === 'ios' ? 1.2 : 1.2) * ICON_SCALE

export default function ReadiumHeader() {
	const router = useRouter()

	const { isDarkEpubTheme } = useEpubTheme()
	const buttonColors = useButtonColors()
	const showControls = useReaderStore((state) => state.showControls)

	return (
		<View className="inset-x-safe h-12 px-8 mb-2 z-20 items-center justify-center">
			{showControls && (
				<Animated.View
					entering={ENTERING_ANIMATION}
					exiting={EXITING_ANIMATION}
					className="left-6 absolute z-30"
					style={{ width: BUTTON_SIZE, height: BUTTON_SIZE }}
				>
					<GlassView
						className="flex-1 rounded-full"
						isInteractive
						colorScheme={isDarkEpubTheme ? 'dark' : 'light'}
						style={{ backgroundColor: buttonColors.controls.background }}
					>
						<Pressable
							disabled={!showControls}
							onPress={router.back}
							className={cn(
								'h-full w-full items-center justify-center',
								!IS_IOS_26_PLUS && 'active:opacity-60',
							)}
						>
							<Icon
								as={Platform.OS === 'ios' ? X : ArrowLeft}
								size={ICON_SIZE}
								absoluteStrokeWidth
								strokeWidth={2.5}
								color={buttonColors.controls.foreground}
							/>
						</Pressable>
					</GlassView>
				</Animated.View>
			)}

			<Title />
		</View>
	)
}

function Title() {
	const { colors } = useEpubTheme()
	const { primaryStyle, secondaryStyle } = useReaderAnimations()
	const preferMinimalReader = usePreferencesStore((state) => state.preferMinimalReader)
	const showControls = useReaderStore((state) => state.showControls)
	const { chapterTitle, progressText } = useChapterProgress()

	return (
		<>
			{/* Controls hidden */}
			{!preferMinimalReader && (
				<Animated.View style={primaryStyle} className="absolute w-full items-center justify-center">
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
			<Animated.View
				className="absolute w-full items-center justify-center"
				style={secondaryStyle}
				pointerEvents={showControls ? undefined : 'none'}
			>
				<Animated.View
					key={preferMinimalReader ? chapterTitle : progressText}
					entering={FADE_IN}
					exiting={FADE_OUT}
				>
					<Text
						numberOfLines={1}
						style={{ color: colors?.foreground }}
						className="font-medium opacity-50"
					>
						{preferMinimalReader ? chapterTitle : progressText}
					</Text>
				</Animated.View>
			</Animated.View>
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
