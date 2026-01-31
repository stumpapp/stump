import { FlashList, FlashListRef, ViewToken } from '@shopify/flash-list'
import { getColor, serialize } from 'colorjs.io/fn'
import { GlassView } from 'expo-glass-effect'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Platform, Pressable, useWindowDimensions, View } from 'react-native'
import { ScrollView } from 'react-native-gesture-handler'
import PagerView from 'react-native-pager-view'
import Animated, { Easing, Keyframe } from 'react-native-reanimated'
import { stripHtml } from 'string-strip-html'

import { ThumbnailImage } from '~/components/image'
import { Heading, Text } from '~/components/ui'
import { useColors } from '~/lib/constants'
import { useColorScheme } from '~/lib/useColorScheme'
import { cn } from '~/lib/utils'
import { usePreferencesStore } from '~/stores'
import { flattenToc, type TableOfContentsItem, useEpubLocationStore } from '~/stores/epub'
import { useEpubSheetStore } from '~/stores/epubSheet'

import AnnotationsAndBookmarks from './AnnotationsAndBookmarks'

export default function LocationsSheetContent() {
	const [activePage, setActivePage] = useState(0)
	const [visibleRange, setVisibleRange] = useState({ min: 0, max: 0 })

	const { height: windowHeight } = useWindowDimensions()

	const pagerHeight =
		windowHeight -
		72 - // py-6 + text(ish)
		60 // tabs

	const pagerViewRef = useRef<PagerView>(null)
	const flashListRef = useRef<FlashListRef<TableOfContentsItemWithLevel>>(null)

	const book = useEpubLocationStore((store) => store.book)
	const toc = useEpubLocationStore((store) => store.toc)
	const embeddedMetadata = useEpubLocationStore((store) => store.embeddedMetadata)
	const position = useEpubLocationStore((store) => store.position)
	const currentChapter = useEpubLocationStore((store) => store.currentChapter)

	const requestHeaders = useEpubLocationStore((store) => store.requestHeaders)

	const thumbnailRatio = usePreferencesStore((state) => state.thumbnailRatio)

	const bookTitle = book?.name || embeddedMetadata?.title
	const bookAuthor = book?.metadata?.writers?.join(', ') || embeddedMetadata?.author
	const bookPublisher = book?.metadata?.publisher || embeddedMetadata?.publisher

	const flatTocWithLevels = flattenTocWithLevels(toc)

	const findNextItem = (item: TableOfContentsItem) => {
		const flatToc = flattenToc(toc)
		const index = flatToc.indexOf(item)
		return flatToc[index + 1]
	}

	const checkIsActive = (item: TableOfContentsItem) => {
		const nextItem = findNextItem(item)
		if (item.position) {
			const isAfterChapterStart = position >= item.position
			const isBeforeChapterEnd = nextItem?.position ? position < nextItem?.position : true
			return isAfterChapterStart && isBeforeChapterEnd
		}
		return item.label === currentChapter
	}

	const activeTocItemIndex = flatTocWithLevels.findIndex(({ item }) => checkIsActive(item))

	const scrollToCurrentChapter = useCallback(
		({ animated }: { animated: boolean }) =>
			flashListRef.current?.scrollToIndex({
				index: activeTocItemIndex,
				animated: animated,
				viewPosition: 0.5,
				// each row is 49px, and we scroll back up a bit to make it look more balanced
				viewOffset: 49 / 2,
			}),
		[activeTocItemIndex],
	)

	// we initially put the active chapter in the middle using this effect since
	// initialScrollIndex does not have a `viewPosition` equivalent
	useEffect(() => {
		scrollToCurrentChapter({ animated: false })
	}, [scrollToCurrentChapter])

	// flash the scrollbar to give a rough indication of where we are
	useEffect(() => {
		if (activePage === 1) {
			setTimeout(() => {
				flashListRef.current?.flashScrollIndicators()
			}, 250)
		}
	}, [activePage, scrollToCurrentChapter])

	const showTopIndicator = activeTocItemIndex < visibleRange.min
	const showBottomIndicator = activeTocItemIndex > visibleRange.max

	const onViewableItemsChanged = useCallback(
		({ viewableItems }: { viewableItems: ViewToken<TableOfContentsItemWithLevel>[] }) => {
			if (viewableItems.length > 0) {
				setVisibleRange({
					min: viewableItems.at(0)?.index ?? 0,
					max: viewableItems.at(-1)?.index ?? 0,
				})
			}
		},
		[],
	)

	if (!book) return

	return (
		<View className="flex-1 gap-1">
			<View className="flex-row items-center justify-around px-4 py-6">
				<Pressable onPress={() => pagerViewRef.current?.setPage(0)}>
					{({ pressed }) => (
						<Text
							className={cn('text-lg font-medium text-foreground-subtle', {
								'text-foreground': activePage === 0,
							})}
							style={{ opacity: pressed && activePage !== 0 ? 0.7 : 1 }}
						>
							Overview
						</Text>
					)}
				</Pressable>

				<Pressable onPress={() => pagerViewRef.current?.setPage(1)}>
					{({ pressed }) => (
						<Text
							className={cn('text-lg font-medium text-foreground-subtle', {
								'text-foreground': activePage === 1,
							})}
							style={{ opacity: pressed && activePage !== 1 ? 0.7 : 1 }}
						>
							Contents
						</Text>
					)}
				</Pressable>

				<Pressable onPress={() => pagerViewRef.current?.setPage(2)}>
					{({ pressed }) => (
						<Text
							className={cn('text-lg font-medium text-foreground-subtle', {
								'text-foreground': activePage === 2,
							})}
							style={{ opacity: pressed && activePage !== 2 ? 0.7 : 1 }}
						>
							Annotations
						</Text>
					)}
				</Pressable>
			</View>

			<PagerView
				ref={pagerViewRef}
				style={{ flex: 1, height: pagerHeight }}
				initialPage={0}
				onPageSelected={(e) => setActivePage(e.nativeEvent.position)}
			>
				<View
					style={{
						justifyContent: 'flex-start',
						alignItems: 'center',
					}}
					key="1"
				>
					<ScrollView contentContainerStyle={{ paddingBottom: 16, paddingTop: 12 }}>
						<View className="flex items-center gap-4">
							<ThumbnailImage
								source={{
									uri: book?.thumbnail.url,
									headers: {
										...requestHeaders?.(),
									},
								}}
								resizeMode="stretch"
								size={{ height: 235 / thumbnailRatio, width: 235 }}
								borderAndShadowStyle={{ shadowRadius: 5 }}
							/>

							<View className="gap-2">
								<Heading size="lg" className="text-center" numberOfLines={3}>
									{bookTitle}
								</Heading>

								<Text className="text-center text-base text-foreground-muted">
									{bookAuthor}
									{bookPublisher ? ` • ${bookPublisher}` : null}
								</Text>
							</View>

							{!!book.metadata?.summary && (
								<Text className="px-4 text-center text-sm text-foreground-muted">
									{stripHtml(book.metadata.summary).result}
								</Text>
							)}
						</View>
					</ScrollView>
				</View>

				<View key="2">
					<FlashList
						ref={flashListRef}
						data={flatTocWithLevels}
						contentContainerStyle={{ paddingBottom: 16 }}
						onViewableItemsChanged={onViewableItemsChanged}
						renderItem={({ item, index }) => (
							<TableOfContentsListItem
								item={item.item}
								level={item.level}
								currentChapterActive={index === activeTocItemIndex}
								nextChapterActive={index + 1 === activeTocItemIndex}
							/>
						)}
					/>

					{showTopIndicator && (
						<ScrollToChapterIndicator
							onPress={() => scrollToCurrentChapter({ animated: true })}
							className="top-4"
						/>
					)}

					{showBottomIndicator && (
						<ScrollToChapterIndicator
							onPress={() => scrollToCurrentChapter({ animated: true })}
							className="bottom-6"
						/>
					)}
				</View>

				<View
					style={{
						justifyContent: 'center',
						alignItems: 'center',
					}}
					key="3"
				>
					<AnnotationsAndBookmarks />
				</View>
			</PagerView>
		</View>
	)
}

const TableOfContentsListItem = ({
	item,
	level = 0,
	currentChapterActive,
	nextChapterActive,
}: {
	item: TableOfContentsItem
	level?: number
	currentChapterActive: boolean
	nextChapterActive: boolean
}) => {
	const actions = useEpubLocationStore((store) => store.actions)
	const closeSheet = useEpubSheetStore((state) => state.closeSheet)

	const handlePress = async () => {
		// E.g.: "text/part0010.html#9H5K0-..." -> ["text/part0010.html", "9H5K0-..."]
		const [hrefWithoutFragment, fragment] = item.content.split('#')

		await actions?.goToLocation({
			href: hrefWithoutFragment || item.content,
			type: 'application/xhtml+xml',
			chapterTitle: item.label,
			locations: fragment ? { fragments: [fragment] } : {},
		})

		closeSheet('locations')
	}

	const { isDarkColorScheme } = useColorScheme()
	const colors = useColors()
	const accentColor = usePreferencesStore((state) => state.accentColor)

	const color = getColor(accentColor || colors.fill.brand.DEFAULT)
	color.alpha = isDarkColorScheme ? 0.1 : 0.15
	const backgroundColor = serialize(color, { format: 'hex' })

	const isChild = level > 0
	color.alpha = isDarkColorScheme ? (isChild ? 0.5 : 0.8) : isChild ? 0.7 : 0.9
	const textColor = serialize(color, { format: 'hex' })

	return (
		<View>
			<Pressable onPress={handlePress}>
				{({ pressed }) => (
					<>
						<View
							className={cn('squircle absolute inset-0 rounded-[1.25rem]')}
							style={[
								{ opacity: pressed ? 0.7 : 1, marginLeft: 6 + level * 16, marginRight: 6 },
								currentChapterActive && { backgroundColor: backgroundColor },
							]}
						/>

						<View
							className="w-full flex-row justify-between"
							style={{ opacity: pressed ? 0.7 : 1, paddingLeft: 16 + level * 16, paddingRight: 16 }}
						>
							<Text
								className={cn(
									'flex-1 py-4 text-base',
									currentChapterActive && 'font-bold',
									isChild && 'text-foreground-muted',
								)}
								style={currentChapterActive && { color: textColor }}
							>
								{item.label}
							</Text>
							<Text
								className={cn(
									'shrink-0 py-4 text-base text-foreground-muted',
									currentChapterActive && 'font-bold',
								)}
								style={currentChapterActive && { color: textColor }}
							>
								{item.position || 'Not Available'}
							</Text>
						</View>
					</>
				)}
			</Pressable>

			{!nextChapterActive && !currentChapterActive && <Divider level={level} />}
		</View>
	)
}

const Divider = ({ level = 0 }: { level?: number }) => (
	<View
		className="h-px bg-black/10 dark:bg-white/10"
		style={{
			// for android, it's quite hard to size child dividers to complement full width dividers,
			// or to size any dividers to complement the active background (since it doesn't touch the sides)
			// so instead we won't use full width dividers for android
			marginLeft: (Platform.OS === 'ios' ? 16 : 10) + level * 16,
			marginRight: Platform.OS === 'ios' ? 16 : 10,
		}}
	/>
)

// GlassView doesn't like zero opacity https://github.com/expo/expo/issues/41024
const enteringAnimation = new Keyframe({
	from: { opacity: 0.02 },
	to: { opacity: 1, easing: Easing.inOut(Easing.quad) },
}).duration(350)

const exitingAnimation = new Keyframe({
	from: { opacity: 1 },
	to: { opacity: 0.02, easing: Easing.inOut(Easing.quad) },
}).duration(350)

const ScrollToChapterIndicator = ({
	onPress,
	className,
}: {
	onPress: () => void
	className?: string
}) => {
	const accentColor = usePreferencesStore((state) => state.accentColor)
	const colors = useColors()
	const textColor = accentColor || colors.fill.brand.DEFAULT

	return (
		<Animated.View
			entering={enteringAnimation}
			exiting={exitingAnimation}
			className={cn('absolute left-0 right-0 items-center', className)}
		>
			<Pressable onPress={onPress}>
				<GlassView
					glassEffectStyle="regular"
					style={{ borderRadius: 999 }}
					isInteractive
					// this is for android only, but ios ignores it so it's fine
					className="bg-background-surface"
				>
					<View className="px-4 py-2">
						<Text className="text-base font-semibold" style={{ color: textColor }}>
							Show Current Chapter
						</Text>
					</View>
				</GlassView>
			</Pressable>
		</Animated.View>
	)
}

type TableOfContentsItemWithLevel = { item: TableOfContentsItem; level: number }

const flattenTocWithLevels = (
	toc: TableOfContentsItem[],
	level = 0,
): TableOfContentsItemWithLevel[] => {
	const flatTocWithLevels = toc.reduce((acc, item) => {
		acc.push({ item, level })

		if (item.children && item.children.length > 0) {
			acc.push(...flattenTocWithLevels(item.children, level + 1))
		}

		return acc
	}, [] as TableOfContentsItemWithLevel[])

	return flatTocWithLevels
}
