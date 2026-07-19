import { FlashList, FlashListRef, ViewToken } from '@shopify/flash-list'
import { getColor, serialize } from 'colorjs.io/fn'
import { GlassView } from 'expo-glass-effect'
import { Search } from 'lucide-react-native'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Platform, Pressable, TextInput, View } from 'react-native'
import { useKeyboardHandler } from 'react-native-keyboard-controller'
import Animated from 'react-native-reanimated'
import { scheduleOnRN } from 'react-native-worklets'

import { ThumbnailImage } from '~/components/image'
import { Heading, Icon, Text } from '~/components/ui'
import { IS_IOS_26_PLUS, useColors } from '~/lib/constants'
import { useTranslate } from '~/lib/hooks'
import { useColorScheme } from '~/lib/useColorScheme'
import { cn } from '~/lib/utils'
import { ReadiumLocator } from '~/modules/readium'
import { usePreferencesStore } from '~/stores'
import { type TableOfContentsItem, useEpubLocationStore } from '~/stores/epub'
import { useEpubSheetStore } from '~/stores/epubSheet'

import { ENTERING_ANIMATION, EXITING_ANIMATION } from '../shared'
import { useEpubReaderContext } from './context'
import { GoToPage } from './TableOfContentsSheet'

type Props = {
	goToPage: GoToPage
	isOpen: boolean
}

export default function TableOfContentsSheetContent({ goToPage, isOpen }: Props) {
	const colors = useColors()
	const accentColor = usePreferencesStore((state) => state.accentColor)
	const { t } = useTranslate()
	const { getRequestHeaders } = useEpubReaderContext()
	const thumbnailRatio = usePreferencesStore((state) => state.thumbnailRatio)

	const [visibleRange, setVisibleRange] = useState({ min: 0, max: 0 })
	const [textInputWidth, setTextInputWidth] = useState<number>()

	const flashListRef = useRef<FlashListRef<TableOfContentsItemWithLevel>>(null)

	const book = useEpubLocationStore((store) => store.book)
	const toc = useEpubLocationStore((store) => store.toc)
	const bookTitle = useEpubLocationStore((store) => book?.name || store.embeddedMetadata?.title)
	const currentChapter = useEpubLocationStore((store) => store.currentChapter)
	const currentPage = useEpubLocationStore((store) => store.position)
	const totalPages = useEpubLocationStore((store) => store.totalPages)

	const flatTocWithLevels = flattenTocWithLevels(toc)

	const activeTocItemIndex = flatTocWithLevels.findIndex(({ item }) => {
		return item.label === currentChapter
	})

	const scrollToCurrentChapter = useCallback(
		({ animated }: { animated: boolean }) =>
			flashListRef.current?.scrollToIndex({
				index: activeTocItemIndex,
				animated: animated,
				viewPosition: 0.5,
				// scroll back up a bit to make it look more balanced (by half of: row width + rough header height)
				viewOffset: (49 + 82) / 2,
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
		if (!isOpen) return
		flashListRef.current?.flashScrollIndicators()
	}, [isOpen])

	const scrollToCurrentChapterOnKeyboardShow = () => {
		const layout = flashListRef.current?.getLayout(activeTocItemIndex)
		if (!layout) return
		// scroll up by 7px to add some padding
		const offset = layout.y - 7
		flashListRef.current?.scrollToOffset({
			offset,
			animated: true,
		})
	}

	useKeyboardHandler(
		{
			onStart: (e) => {
				'worklet'
				if (e.progress === 1) {
					scheduleOnRN(scrollToCurrentChapterOnKeyboardShow)
				}
				if (e.progress === 0) {
					scheduleOnRN(goToPage.reset)
				}
			},
		},
		[],
	)

	const showTopIndicator =
		isOpen && activeTocItemIndex !== -1 && activeTocItemIndex < visibleRange.min
	const showBottomIndicator =
		isOpen && activeTocItemIndex !== -1 && activeTocItemIndex > visibleRange.max

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
		<>
			<View className="flex-1">
				<View className="px-4 gap-4 pb-4 pt-6 flex-row">
					<ThumbnailImage
						source={{
							uri: book.thumbnail.url,
							headers: {
								...getRequestHeaders?.(),
							},
						}}
						placeholderData={book.thumbnail.metadata}
						size={{ height: 82, width: 82 * thumbnailRatio }}
					/>

					<View className="pb-0.5 flex-1 justify-between">
						<Heading className="shrink" numberOfLines={2}>
							{bookTitle}
						</Heading>

						<View className="flex-row items-center justify-between">
							<Text className="text-[#898d94]">
								{t('common.pageXOfY', { current: currentPage, total: totalPages })}
							</Text>

							<GlassView
								isInteractive
								className={cn(
									'right-0 h-10 px-4 gap-2 absolute flex-row items-center justify-center rounded-full',
									!IS_IOS_26_PLUS && 'squircle bg-background-surface',
								)}
							>
								<Icon as={Search} size={12} strokeWidth={2.5} color="#898d94" />
								<TextInput
									hitSlop={50}
									placeholderTextColor="#898d94"
									keyboardType="number-pad"
									selectionColor={accentColor || colors.fill.brand.DEFAULT}
									placeholder={t('tableOfContents.goToPagePlaceholder')}
									onLayout={(e) => setTextInputWidth(e.nativeEvent.layout.width)}
									onChangeText={(text) => goToPage.setString(text)}
									value={goToPage.string}
									style={{
										width: textInputWidth,
										color:
											goToPage.isValid || goToPage.isEmpty
												? colors.foreground.DEFAULT
												: colors.fill.danger.DEFAULT,
									}}
								/>
							</GlassView>
						</View>
					</View>
				</View>

				<View className="bg-black/10 dark:bg-white/10 mx-[6px] h-px" />

				<View className="flex-1">
					<FlashList
						ref={flashListRef}
						data={flatTocWithLevels}
						contentContainerClassName={cn(activeTocItemIndex === 0 && 'pt-2')}
						onViewableItemsChanged={onViewableItemsChanged}
						// compensate for the toolbar: h-14 = 49px, plus the gap between the keyboard and toolbar, plus extra padding above the toolbar
						contentContainerStyle={{ paddingBottom: 49 + 7 + 7 }}
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
							className="top-2"
						/>
					)}

					{showBottomIndicator && (
						<ScrollToChapterIndicator
							onPress={() => scrollToCurrentChapter({ animated: true })}
							className="bottom-safe-offset-2"
						/>
					)}
				</View>
			</View>
		</>
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
	const { readerRef } = useEpubReaderContext()
	const { t } = useTranslate()
	const closeSheet = useEpubSheetStore((state) => state.closeSheet)
	const pushJump = useEpubLocationStore((state) => state.pushJump)

	const handlePress = async () => {
		// E.g.: "text/part0010.html#9H5K0-..." -> ["text/part0010.html", "9H5K0-..."]
		const [hrefWithoutFragment, fragment] = item.content.split('#')

		const newLocator: ReadiumLocator = {
			href: hrefWithoutFragment || item.content,
			type: 'application/xhtml+xml',
			chapterTitle: item.label,
			locations: {
				...(fragment && { fragments: [fragment] }),
				...(item.position != null && { position: item.position }),
			},
		}

		pushJump(newLocator)
		await readerRef?.goToLocation(newLocator)
		closeSheet('tableOfContents')
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
							className={cn('squircle inset-0 absolute rounded-[1.25rem]')}
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
									'py-4 text-base flex-1',
									currentChapterActive && 'font-bold',
									isChild && 'text-foreground-muted',
								)}
								style={currentChapterActive && { color: textColor }}
							>
								{item.label}
							</Text>
							<Text
								className={cn(
									'py-4 text-base text-foreground-muted shrink-0',
									currentChapterActive && 'font-bold',
								)}
								style={currentChapterActive && { color: textColor }}
							>
								{item.position || t('common.notAvailable')}
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
		className="bg-black/10 dark:bg-white/10 h-px"
		style={{
			// for android, it's quite hard to size child dividers to complement full width dividers,
			// or to size any dividers to complement the active background (since it doesn't touch the sides)
			// so instead we won't use full width dividers for android
			marginLeft: (Platform.OS === 'ios' ? 16 : 10) + level * 16,
			marginRight: Platform.OS === 'ios' ? 16 : 10,
		}}
	/>
)

const ScrollToChapterIndicator = ({
	onPress,
	className,
}: {
	onPress: () => void
	className?: string
}) => {
	const { t } = useTranslate()
	const accentColor = usePreferencesStore((state) => state.accentColor)
	const colors = useColors()
	const textColor = accentColor || colors.fill.brand.DEFAULT

	return (
		<Animated.View
			entering={ENTERING_ANIMATION}
			exiting={EXITING_ANIMATION}
			className={cn('left-0 right-0 absolute items-center', className)}
		>
			<Pressable onPress={onPress}>
				<GlassView
					glassEffectStyle="regular"
					style={{ borderRadius: 999 }}
					isInteractive
					className={cn(!IS_IOS_26_PLUS && 'bg-background-surface')}
				>
					<View className="px-4 py-2">
						<Text className="text-base font-semibold" style={{ color: textColor }}>
							{t('tableOfContents.showCurrentChapter')}
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
