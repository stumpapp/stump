import { useRouter } from 'expo-router'
import { useRef, useState } from 'react'
import { View } from 'react-native'
import { Pressable, ScrollView } from 'react-native-gesture-handler'
import PagerView from 'react-native-pager-view'
import { stripHtml } from 'string-strip-html'

import { ThumbnailImage } from '~/components/image'
import { Heading, Text } from '~/components/ui'
import { cn } from '~/lib/utils'
import { usePreferencesStore } from '~/stores'
import { type TableOfContentsItem, useEpubLocationStore } from '~/stores/epub'

export default function LocationsSheetContent() {
	const [activePage, setActivePage] = useState(0)

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
				style={{ flex: 1 }}
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
						{toc?.map((item) => <TableOfContentsListItem key={item.label} item={item} />)}
					</ScrollView>
				</View>
				<View
					style={{
						justifyContent: 'center',
						alignItems: 'center',
					}}
					key="3"
				>
					<Text>Annotations not supported yet</Text>
				</View>
			</PagerView>
		</View>
	)
}

// TODO: Calculate page?
const TableOfContentsListItem = ({ item }: { item: TableOfContentsItem }) => {
	const router = useRouter()
	const actions = useEpubLocationStore((store) => store.actions)
	const currentChapter = useEpubLocationStore((store) => store.currentChapter)

	const handlePress = async () => {
		// E.g.: "text/part0010.html#9H5K0-..." -> ["text/part0010.html", "9H5K0-..."]
		const [hrefWithoutFragment, fragment] = item.content.split('#')

		await actions?.goToLocation({
			href: hrefWithoutFragment,
			type: 'application/xhtml+xml',
			chapterTitle: item.label,
			locations: fragment
				? {
						fragments: [fragment],
					}
				: undefined,
		})

		// This pushes the dismiss to the end of the call stack to try and
		// avoid a crash which happens on Android if the dismiss occurs too
		// closely after the readium navigation change
		setTimeout(() => {
			router.dismiss()
		})
	}

	return (
		<View>
			<Pressable onPress={handlePress}>
				{({ pressed }) => (
					<View
						className={cn('w-full px-4', {
							'bg-background-surface': currentChapter === item.label,
						})}
						style={{ opacity: pressed ? 0.7 : 1 }}
					>
						<Text className="py-4 text-base">{item.label}</Text>
					</View>
				)}
			</Pressable>
			<Divider />

			{item.children.map((child) => (
				<View key={child.label} className="ml-4">
					<TableOfContentsListItem item={child} />
				</View>
			))}
		</View>
	)
}

const Divider = () => <View className="h-px w-full bg-edge" />
