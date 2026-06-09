import { FlashList, FlashListRef, ViewToken } from '@shopify/flash-list'
import { getColor, serialize } from 'colorjs.io/fn'
import { GlassView } from 'expo-glass-effect'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Platform, Pressable, View } from 'react-native'
import Animated, { Easing, Keyframe } from 'react-native-reanimated'

import { Text } from '~/components/ui'
import { useColors } from '~/lib/constants'
import { useColorScheme } from '~/lib/useColorScheme'
import { cn } from '~/lib/utils'
import { usePreferencesStore } from '~/stores'
import { type TableOfContentsItem, useEpubLocationStore } from '~/stores/epub'
import { useEpubSheetStore } from '~/stores/epubSheet'

import { useEpubReaderContext } from './context'

export default function TableOfContentsSheetContent() {
	const [visibleRange, setVisibleRange] = useState({ min: 0, max: 0 })

	const flashListRef = useRef<FlashListRef<TableOfContentsItemWithLevel>>(null)

	const book = useEpubLocationStore((store) => store.book)
	const toc = useEpubLocationStore((store) => store.toc)
	const currentChapter = useEpubLocationStore((store) => store.currentChapter)

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
		<View className="flex-1">
			<FlashList
				ref={flashListRef}
				data={flatTocWithLevels}
				contentContainerStyle={{ paddingTop: 16 }}
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
					className="top-6"
				/>
			)}

			{showBottomIndicator && (
				<ScrollToChapterIndicator
					onPress={() => scrollToCurrentChapter({ animated: true })}
					className="bottom-6"
				/>
			)}
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
	const { readerRef } = useEpubReaderContext()
	const closeSheet = useEpubSheetStore((state) => state.closeSheet)
	const locator = useEpubLocationStore((state) => state.locator)
	const position = useEpubLocationStore((state) => state.position)
	const pushJump = useEpubLocationStore((state) => state.pushJump)

	const handlePress = async () => {
		const previousLocator = locator

		// If jumping to higher position, return direction should be 'back'
		// If jumping to lower position, return direction should be 'forward'
		const targetPosition = item.position
		const direction: 'back' | 'forward' =
			targetPosition != null && position != null && targetPosition > position ? 'back' : 'forward'

		// E.g.: "text/part0010.html#9H5K0-..." -> ["text/part0010.html", "9H5K0-..."]
		const [hrefWithoutFragment, fragment] = item.content.split('#')

		await readerRef?.goToLocation({
			href: hrefWithoutFragment || item.content,
			type: 'application/xhtml+xml',
			chapterTitle: item.label,
			locations: fragment ? { fragments: [fragment] } : {},
		})

		if (previousLocator) {
			pushJump(previousLocator, direction)
		}

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
			className={cn('left-0 right-0 absolute items-center', className)}
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
