import { getColor, serialize } from 'colorjs.io/fn'
import { useRef, useState } from 'react'
import { Pressable, useWindowDimensions, View } from 'react-native'
import { ScrollView } from 'react-native-gesture-handler'
import PagerView from 'react-native-pager-view'
import { stripHtml } from 'string-strip-html'

import { ThumbnailImage } from '~/components/image'
import { Heading, Text } from '~/components/ui'
import { useColors } from '~/lib/constants'
import { useColorScheme } from '~/lib/useColorScheme'
import { cn } from '~/lib/utils'
import { usePreferencesStore } from '~/stores'
import { type TableOfContentsItem, useEpubLocationStore } from '~/stores/epub'
import { useEpubSheetStore } from '~/stores/epubSheet'

import AnnotationsAndBookmarks from './AnnotationsAndBookmarks'

export default function LocationsSheetContent() {
	const [activePage, setActivePage] = useState(0)
	const { height: windowHeight } = useWindowDimensions()

	const pagerHeight =
		windowHeight -
		72 - // py-6 + text(ish)
		60 // tabs

	const ref = useRef<PagerView>(null)

	const book = useEpubLocationStore((store) => store.book)
	const toc = useEpubLocationStore((store) => store.toc)
	const embeddedMetadata = useEpubLocationStore((store) => store.embeddedMetadata)

	const requestHeaders = useEpubLocationStore((store) => store.requestHeaders)

	const thumbnailRatio = usePreferencesStore((state) => state.thumbnailRatio)

	const bookTitle = book?.name || embeddedMetadata?.title
	const bookAuthor = book?.metadata?.writers?.join(', ') || embeddedMetadata?.author
	const bookPublisher = book?.metadata?.publisher || embeddedMetadata?.publisher

	if (!book) return

	return (
		<View className="flex-1 gap-1">
			<View className="flex-row items-center justify-around px-4 py-6">
				<Pressable onPress={() => ref.current?.setPage(0)}>
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

				<Pressable onPress={() => ref.current?.setPage(1)}>
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

				<Pressable onPress={() => ref.current?.setPage(2)}>
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
				ref={ref}
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

				<View
					style={{
						justifyContent: 'center',
						alignItems: 'center',
					}}
					key="2"
				>
					<ScrollView className="w-full" contentContainerStyle={{ paddingBottom: 16 }}>
						{toc?.map((item) => (
							<TableOfContentsListItem key={item.label} item={item} />
						))}
					</ScrollView>
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
	className,
}: {
	item: TableOfContentsItem
	level?: number
	className?: string
}) => {
	const actions = useEpubLocationStore((store) => store.actions)
	const currentChapter = useEpubLocationStore((store) => store.currentChapter)
	const position = useEpubLocationStore((store) => store.position)
	const toc = useEpubLocationStore((store) => store.toc)
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

	// Hide Divider if:
	// 1. next item is active (hides Divider above active item)
	// 2. current item is active (hides Divider below active item)
	const nextItem = findNextItem(item)
	const currentChapterActive = checkIsActive(item)
	const nextChapterActive = nextItem ? checkIsActive(nextItem) : false

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
								className={cn('py-4 text-base', currentChapterActive && 'font-bold', className)}
								style={currentChapterActive && { color: textColor }}
							>
								{item.label}
							</Text>
							<Text
								className={cn(
									'py-4 text-base text-foreground-muted',
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

			{item.children.map((child) => (
				<View key={child.label}>
					<TableOfContentsListItem
						item={child}
						level={level + 1}
						className="text-foreground-muted"
					/>
				</View>
			))}
		</View>
	)
}

const Divider = ({ level = 0 }: { level?: number }) => (
	<View
		className="h-px bg-black/10 dark:bg-white/10"
		style={{ marginLeft: 16 + level * 16, marginRight: 16 }}
	/>
)

function flattenToc(toc: TableOfContentsItem[]): TableOfContentsItem[] {
	return toc.flatMap((item) => [item, ...flattenToc(item.children || [])])
}
