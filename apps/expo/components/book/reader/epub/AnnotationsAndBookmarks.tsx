import { Host, Picker } from '@expo/ui/swift-ui'
import dayjs from 'dayjs'
import { Bookmark, Highlighter, Notebook } from 'lucide-react-native'
import { useCallback, useMemo, useState } from 'react'
import { FlatList, Platform, Pressable, View } from 'react-native'
import Swipeable from 'react-native-gesture-handler/ReanimatedSwipeable'
import Reanimated, { SharedValue, useAnimatedStyle } from 'react-native-reanimated'

import { Icon, Tabs, Text } from '~/components/ui'
import { cn } from '~/lib/utils'
import { Decoration, ReadiumLocator } from '~/modules/readium'
import { BookmarkRef, useEpubLocationStore } from '~/stores/epub'
import { useEpubSheetStore } from '~/stores/epubSheet'

type Tab = 'ALL' | 'NOTES' | 'HIGHLIGHTS' | 'BOOKMARKS'

const TAB_ARRANGEMENT: Tab[] = ['ALL', 'NOTES', 'HIGHLIGHTS', 'BOOKMARKS']

export default function AnnotationsAndBookmarks() {
	const book = useEpubLocationStore((store) => store.book)
	const annotations = useEpubLocationStore((store) => store.annotations)
	const bookmarks = useEpubLocationStore((store) => store.bookmarks)

	const [tab, setTab] = useState<Tab>('ALL')

	const listItems = useMemo(() => {
		switch (tab) {
			case 'ALL':
				return [...annotations, ...bookmarks].sort((a, b) => {
					const dateA = new Date(a.createdAt).getTime()
					const dateB = new Date(b.createdAt).getTime()
					return dateB - dateA // newest first
				})
			case 'NOTES':
				return annotations.filter((a) => !!a.annotationText)
			case 'HIGHLIGHTS':
				return annotations.filter((a) => !a.annotationText)
			case 'BOOKMARKS':
				return bookmarks
			default:
				return []
		}
	}, [tab, annotations, bookmarks])

	const actions = useEpubLocationStore((state) => state.actions)
	const closeSheet = useEpubSheetStore((state) => state.closeSheet)

	const onNavigate = useCallback(
		async (locator: ReadiumLocator) => {
			if (!actions) return

			await actions.goToLocation(locator)

			closeSheet('locations')
		},
		[actions, closeSheet],
	)

	const removeBookmark = useEpubLocationStore((state) => state.removeBookmark)
	const onDeleteBookmark = useEpubLocationStore((state) => state.onDeleteBookmark)

	const handleDeleteBookmark = useCallback(
		async (id: string) => {
			if (!onDeleteBookmark) return
			try {
				await onDeleteBookmark(id)
				removeBookmark(id)
			} catch (error) {
				console.error('Failed to delete bookmark:', error)
			}
		},
		[onDeleteBookmark, removeBookmark],
	)

	type Item = (typeof listItems)[number]
	const isBookmark = useCallback(
		(item: Item): item is BookmarkRef => 'href' in item && !('color' in item),
		[],
	)
	const renderItem = useCallback(
		({ item }: { item: Item }) => {
			if (isBookmark(item)) {
				return (
					<BookmarkListItem
						bookmark={item}
						onTap={() =>
							onNavigate({
								href: item.href,
								chapterTitle: item.chapterTitle || '',
								locations: item.locations || undefined,
								type: 'application/xhtml+xml',
							})
						}
						onDelete={() => handleDeleteBookmark(item.id)}
					/>
				)
			} else {
				return (
					<AnnotationListItem
						annotation={item}
						onTap={() => onNavigate(item.locator)}
						onDelete={() => {
							// TODO: Handle annotation delete
						}}
					/>
				)
			}
		},
		[isBookmark, onNavigate, handleDeleteBookmark],
	)

	return (
		<View className="w-full flex-1">
			<ListHeader tab={tab} setTab={setTab} />
			<FlatList
				key={book?.id}
				data={listItems}
				style={{ flex: 1, width: '100%' }}
				contentContainerStyle={{ paddingBottom: 16 }}
				extraData={tab}
				// FIXME: Not sure why this doesn't work well on iOS, if I had to guess maybe the
				// native components? It's a funky issue where the items won't render reliably
				// ListHeaderComponent={<ListHeader tab={tab} setTab={setTab} />}
				renderItem={renderItem}
				keyExtractor={(item) =>
					isBookmark(item) ? `bookmark-${item.id}` : `annotation-${item.id}`
				}
			/>
		</View>
	)
}

type HeaderProps = {
	tab: Tab
	setTab: (tab: Tab) => void
}

function ListHeader({ tab, setTab }: HeaderProps) {
	return (
		<View className="w-full px-4 pb-2">
			{Platform.select({
				ios: (
					<View className="w-full">
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
					</View>
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
	)
}

// TODO: Are swipables best? Can't get them to work with pressable clicks well

type SharedItemProps = {
	onTap: () => void
	onDelete: () => void
}

type Props = {
	annotation: Decoration
} & SharedItemProps

function AnnotationListItem({ annotation, onTap, onDelete }: Props) {
	const isHighlightOnly = !annotation.annotationText
	const title = annotation.locator.chapterTitle || (isHighlightOnly ? 'Highlight' : 'Note')
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
				<Pressable onPress={onTap} className="flex-1" onLongPress={() => {}} delayLongPress={100}>
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

type BookmarkProps = {
	bookmark: BookmarkRef
} & SharedItemProps

function BookmarkListItem({ bookmark, onDelete, onTap }: BookmarkProps) {
	const title = bookmark.chapterTitle || 'Bookmark'
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
				<Pressable onPress={onTap} className="flex-1" onLongPress={() => {}} delayLongPress={100}>
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

// TODO: make not ugly
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
