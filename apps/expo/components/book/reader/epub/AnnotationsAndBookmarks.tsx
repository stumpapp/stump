import { Host, Picker } from '@expo/ui/swift-ui'
import dayjs from 'dayjs'
import partition from 'lodash/partition'
import { Bookmark, Highlighter, Notebook } from 'lucide-react-native'
import { useCallback, useMemo, useState } from 'react'
import { FlatList, Platform, Pressable, View } from 'react-native'
import Swipeable from 'react-native-gesture-handler/ReanimatedSwipeable'
import Reanimated, { SharedValue, useAnimatedStyle } from 'react-native-reanimated'

import { Icon, Tabs, Text } from '~/components/ui'
import { cn } from '~/lib/utils'
import { useEpubLocationStore } from '~/stores/epub'

import { EbookReaderBookRef } from '../image/context'

type Tab = 'ALL' | 'NOTES' | 'HIGHLIGHTS' | 'BOOKMARKS'

const TAB_ARRANGEMENT: Tab[] = ['ALL', 'NOTES', 'HIGHLIGHTS', 'BOOKMARKS']

export default function AnnotationsAndBookmarks() {
	const book = useEpubLocationStore((store) => store.book)

	const [annotations, hightlights] = useMemo(
		() => partition(book?.ebook?.annotations || [], (item) => Boolean(item.annotationText)),
		[book?.ebook?.annotations],
	)
	const bookmarks = useMemo(() => book?.ebook?.bookmarks || [], [book?.ebook?.bookmarks])

	const [tab, setTab] = useState<Tab>('ALL')

	const listItems = useMemo(() => {
		switch (tab) {
			case 'ALL':
				return [...annotations, ...hightlights, ...bookmarks].sort((a, b) => {
					const dateA = new Date(a.createdAt).getTime()
					const dateB = new Date(b.createdAt).getTime()
					return dateB - dateA // newest first
				})
			case 'NOTES':
				return annotations
			case 'HIGHLIGHTS':
				return hightlights
			case 'BOOKMARKS':
				return bookmarks
			default:
				return []
		}
	}, [tab, annotations, hightlights, bookmarks])

	type Item = (typeof listItems)[number]
	const renderItem = useCallback(({ item }: { item: Item }) => {
		if (item.__typename === 'Bookmark') {
			return (
				<BookmarkListItem
					bookmark={item}
					onTap={() => {
						// Handle bookmark tap
					}}
					onDelete={() => {
						// Handle bookmark delete
					}}
				/>
			)
		} else if (item.__typename === 'MediaAnnotationModel') {
			return (
				<AnnotationListItem
					annotation={item}
					onTap={() => {
						// Handle annotation tap
					}}
					onDelete={() => {
						// Handle annotation delete
					}}
				/>
			)
		} else return null
	}, [])

	return (
		<FlatList
			key={book?.id || 'no-book'}
			data={listItems}
			className="w-full"
			contentContainerStyle={{ paddingBottom: 16 }}
			ListHeaderComponent={
				<View className="w-full flex-1 px-4">
					{Platform.select({
						ios: (
							<Host matchContents style={{ width: 'auto' }}>
								<Picker
									options={['All', 'Notes', 'Highlights', 'Bookmarks']}
									selectedIndex={TAB_ARRANGEMENT.indexOf(tab)}
									onOptionSelected={({ nativeEvent: { index } }) => {
										setTab(TAB_ARRANGEMENT[index] || 'ALL')
									}}
									variant="segmented"
								/>
							</Host>
						),
						android: (
							<Tabs value={tab} onValueChange={(value) => setTab(value as Tab)}>
								<Tabs.List className="flex-row">
									<Tabs.Trigger value="ALL">
										<Text>All</Text>
									</Tabs.Trigger>

									<Tabs.Trigger value="NOTES">
										<Text>Notes</Text>
									</Tabs.Trigger>

									<Tabs.Trigger value="HIGHLIGHTS">
										<Text>Highlights</Text>
									</Tabs.Trigger>

									<Tabs.Trigger value="BOOKMARKS">
										<Text>Bookmarks</Text>
									</Tabs.Trigger>
								</Tabs.List>
							</Tabs>
						),
					})}
				</View>
			}
			renderItem={renderItem}
		/>
	)
}

type SharedItemProps = {
	onTap: () => void
	onDelete: () => void
}

type Annotation = NonNullable<EbookReaderBookRef['ebook']>['annotations'][number]

type Props = {
	annotation: Annotation
} & SharedItemProps

function AnnotationListItem({ annotation, onTap, onDelete }: Props) {
	const isHighlightOnly = !annotation.annotationText
	const title = annotation.locator?.chapterTitle || (isHighlightOnly ? 'Highlight' : 'Note')
	const displayText = annotation.annotationText
	const displayDate = annotation.createdAt
		? dayjs(annotation.createdAt).format('MMM D, YYYY [at] h:mm A')
		: null

	return (
		<View className="w-full">
			<Swipeable
				friction={2}
				rightThreshold={40}
				renderRightActions={(prog, drag) => RenderHeaderAction(prog, drag, onDelete)}
			>
				<Pressable onPress={onTap} className="flex-1">
					{({ pressed }) => (
						<View
							className={cn('flex-1 px-4 py-3', {
								'opacity-70': pressed,
							})}
						>
							<View className="flex-row justify-between">
								<Text className="text-base font-medium" numberOfLines={1}>
									{title}
								</Text>

								<Icon
									as={isHighlightOnly ? Highlighter : Notebook}
									className="h-5 w-5 text-foreground-muted/90"
								/>
							</View>

							{displayText && (
								<Text className="mt-1 text-sm text-foreground-muted" numberOfLines={2}>
									&ldquo;{displayText}&rdquo;
								</Text>
							)}

							{displayDate && (
								<Text className="mt-1 text-xs text-foreground-subtle">{displayDate}</Text>
							)}
						</View>
					)}
				</Pressable>
			</Swipeable>
		</View>
	)
}

type Bookmark = NonNullable<EbookReaderBookRef['ebook']>['bookmarks'][number]

type BookmarkProps = {
	bookmark: Bookmark
} & SharedItemProps

function BookmarkListItem({ bookmark, onDelete, onTap }: BookmarkProps) {
	const title = bookmark.locator?.chapterTitle || 'Bookmark'
	const displayText = bookmark.previewContent
	const displayDate = bookmark.createdAt
		? dayjs(bookmark.createdAt).format('MMM D, YYYY [at] h:mm A')
		: null

	return (
		<View className="w-full">
			<Swipeable
				friction={2}
				rightThreshold={40}
				renderRightActions={(prog, drag) => RenderHeaderAction(prog, drag, onDelete)}
			>
				<Pressable onPress={onTap} className="flex-1">
					{({ pressed }) => (
						<View
							className={cn('flex-1 px-4 py-3', {
								'opacity-70': pressed,
							})}
						>
							<View className="flex-row justify-between">
								<Text className="text-base font-medium" numberOfLines={1}>
									{title}
								</Text>

								<Icon as={Bookmark} className="h-5 w-5 text-foreground-muted/90" />
							</View>

							{displayText && (
								<Text className="mt-1 text-sm text-foreground-muted" numberOfLines={2}>
									&ldquo;{displayText}&rdquo;
								</Text>
							)}

							{displayDate && (
								<Text className="mt-1 text-xs text-foreground-subtle">{displayDate}</Text>
							)}
						</View>
					)}
				</Pressable>
			</Swipeable>
		</View>
	)
}

function RenderHeaderAction(
	_: SharedValue<number>,
	drag: SharedValue<number>,
	onDelete: () => void,
) {
	const styleAnimation = useAnimatedStyle(() => {
		return {
			transform: [{ translateX: drag.value + 50 }],
		}
	})

	return (
		<Reanimated.View style={styleAnimation}>
			<Pressable
				className="h-full w-14 items-center justify-center bg-fill-danger"
				onPress={onDelete}
			>
				{({ pressed }) => <Text className={cn({ 'opacity-80': pressed })}>Delete</Text>}
			</Pressable>
		</Reanimated.View>
	)
}
