import * as Sentry from '@sentry/react-native'
import { ALargeSmall, TableOfContents } from 'lucide-react-native'
import { useEffect, useMemo } from 'react'
import { Pressable, View } from 'react-native'
import Animated from 'react-native-reanimated'
import { initialWindowMetrics, useSafeAreaInsets } from 'react-native-safe-area-context'

import BackLink from '~/components/BackLink'
import { FADE_IN, FADE_OUT, useReaderAnimations } from '~/components/book/reader/shared'
import { Text } from '~/components/ui'
import { Icon } from '~/components/ui/icon'
import { usePreferencesStore } from '~/stores'
import { flattenToc, useEpubLocationStore, useEpubTheme } from '~/stores/epub'
import { useEpubSheetStore } from '~/stores/epubSheet'

import BookmarkButton from './BookmarkButton'

export const HEADER_HEIGHT = 48

// TODO: Figure out ideal UI for reader, I have largely been influenced by Yomu but
// think I want to deviate a bit moving forward

export default function ReadiumHeader() {
	const { colors } = useEpubTheme()
	const insets = useSafeAreaInsets()

	const { secondaryStyle, primaryStyle } = useReaderAnimations()
	const preferMinimalReader = usePreferencesStore((state) => state.preferMinimalReader)
	const { chapterTitle, progressText } = useChapterProgress()

	return (
		<>
			{/* Controls hidden */}
			{!preferMinimalReader && (
				<Animated.View
					className="inset-x-safe h-12 px-8 absolute z-20 items-center justify-center"
					style={[{ top: initialWindowMetrics?.insets.top || insets.top }, primaryStyle]}
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
			<Animated.View
				className="inset-x-safe h-12 gap-2 px-4 absolute z-20 flex-row items-center justify-between"
				style={[{ top: initialWindowMetrics?.insets.top || insets.top }, secondaryStyle]}
			>
				<View className="gap-4 flex-row items-center">
					<BackLink
						color={colors?.foreground}
						style={{ opacity: 0.9 }}
						activeOpacity={0.7}
						iconClassName="mr-[unset]"
					/>
					<OpenSheetButton sheet="locations" />
				</View>

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

				<View className="gap-4 flex-row items-center">
					<BookmarkButton color={colors?.foreground} />
					<OpenSheetButton sheet="settings" />
				</View>
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
		if (pagesLeftInChapterRaw == null || pagesLeftInChapterRaw > 0) return

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

function OpenSheetButton({ sheet }: { sheet: 'locations' | 'settings' }) {
	const { colors } = useEpubTheme()
	const openSheet = useEpubSheetStore((state) => state.openSheet)

	const sheetIcon = { locations: TableOfContents, settings: ALargeSmall }

	return (
		<Pressable onPress={() => openSheet(sheet)}>
			{({ pressed }) => (
				<Icon
					as={sheetIcon[sheet]}
					className="h-6 w-6"
					color={colors?.foreground}
					style={{ opacity: pressed ? 0.7 : 0.9 }}
				/>
			)}
		</Pressable>
	)
}
