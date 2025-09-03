import { UserPermission } from '@stump/graphql'
import { useRouter } from 'expo-router'
import { BookCopy, BookText, FolderTree, Heart, LibraryBig, Rows3 } from 'lucide-react-native'
import { Fragment } from 'react'
import { Platform, View } from 'react-native'
import { Pressable, ScrollView } from 'react-native-gesture-handler'
import { SafeAreaView } from 'react-native-safe-area-context'

import { useStumpServer } from '~/components/activeServer'
import { RecentlyAddedSeries } from '~/components/series'
import { Text } from '~/components/ui'
import { useColors } from '~/lib/constants'
import { useDynamicHeader } from '~/lib/hooks/useDynamicHeader'
import { cn } from '~/lib/utils'

// TODO: Use icons icons (lol i know what i mean)

const ITEMS = [
	{
		id: 'books',
		title: 'Books',
		icon: BookText,
		to: '/server/[id]/books',
	},
	{
		id: 'favorites',
		title: 'Favorites',
		to: '/server/[id]/favorites',
		icon: Heart,
	},
	{
		id: 'files',
		title: 'Files',
		to: '/server/[id]/files',
		icon: FolderTree,
		permission: UserPermission.FileExplorer,
	},
	{
		id: 'libraries',
		title: 'Libraries',
		to: '/server/[id]/libraries',
		icon: LibraryBig,
	},
	{
		id: 'series',
		title: 'Series',
		icon: BookCopy,
		to: '/server/[id]/series',
	},

	{
		id: 'smart-lists',
		title: 'Smart Lists',
		icon: Rows3,
		permission: UserPermission.AccessSmartList,
		to: '/server/[id]/smart-lists',
	},
]

export default function Screen() {
	const {
		checkPermission,
		activeServer: { id: serverID },
	} = useStumpServer()

	useDynamicHeader({
		title: 'Browse',
	})

	const router = useRouter()
	const colors = useColors()

	const visibleItems = ITEMS.filter((item) => !item.permission || checkPermission(item.permission))

	return (
		<SafeAreaView
			style={{ flex: 1 }}
			className="bg-background"
			edges={Platform.OS === 'android' ? [] : []}
		>
			<ScrollView contentInsetAdjustmentBehavior="automatic">
				<View className="px-4">
					{visibleItems.map((item, idx) => (
						<Fragment key={item.id}>
							<Pressable
								// @ts-expect-error: String path
								onPress={() => router.push({ pathname: item.to, params: { id: serverID } })}
							>
								<View className="flex flex-row items-center gap-4 py-4">
									<item.icon
										className="h-6 w-6"
										color={colors.foreground.muted}
										stroke={colors.foreground.muted}
									/>
									<Text>{item.title}</Text>
								</View>
							</Pressable>

							{idx < visibleItems.length - 1 && <Divider />}
						</Fragment>
					))}

					<RecentlyAddedSeries />
				</View>
			</ScrollView>
		</SafeAreaView>
	)
}

const Divider = () => <View className={cn('h-px w-full bg-edge')} />

// import { UserPermission } from '@stump/graphql'
// import { useMemo } from 'react'
// import { useWindowDimensions, View } from 'react-native'
// import { ScrollView } from 'react-native-gesture-handler'
// import { useSafeAreaInsets } from 'react-native-safe-area-context'
// import { SimpleGrid } from 'react-native-super-grid'

// import { useStumpServer } from '~/components/activeServer'
// import { StackedBookThumbnails } from '~/components/book'
// import { StackedLibraryThumbnails } from '~/components/library'
// import { StackedSeriesThumbnails } from '~/components/series'
// import { StackedSmartListThumbnails } from '~/components/smartList'
// import { Heading, icons, Text } from '~/components/ui'
// const { Crown, Slash } = icons

// const ITEM_SPACING = 10

// export default function Screen() {
// 	const { width } = useWindowDimensions()
// 	const {
// 		activeServer: { id: serverID },
// 		checkPermission,
// 	} = useStumpServer()

// 	const insets = useSafeAreaInsets()
// 	const showSmartLists = checkPermission(UserPermission.AccessSmartList)
// 	// iPad or other large screens can have more columns (i.e., smaller itemDimension) but most phones should have 2 columns
// 	const isTablet = useMemo(() => width > 768, [width])
// 	const itemDimension = useMemo(
// 		() =>
// 			width /
// 				// 2 columns on phones
// 				(isTablet ? 4 : 2) -
// 			16 * 2, // 16px padding on each side
// 		[isTablet, width],
// 	)

// 	const sections = useMemo(
// 		() => [
// 			{
// 				title: 'Libraries',
// 				href: `/server/${serverID}/libraries`,
// 				render: () => <StackedLibraryThumbnails />,
// 			},
// 			{
// 				title: 'Series',
// 				href: `/server/${serverID}/series`,
// 				render: () => <StackedSeriesThumbnails />,
// 			},
// 			{
// 				title: 'Books',
// 				href: `/server/${serverID}/books`,
// 				render: () => <StackedBookThumbnails />,
// 			},
// 			...(showSmartLists
// 				? [
// 						{
// 							title: 'Smart Lists',
// 							href: `/server/${serverID}/smart-lists`,
// 							render: () => <StackedSmartListThumbnails />,
// 						},
// 					]
// 				: []),
// 		],
// 		[serverID, showSmartLists],
// 	)

// 	return (
// 		<View
// 			className="flex-1 bg-background"
// 			style={{
// 				paddingTop: insets.top,
// 			}}
// 		>
// 			<ScrollView className="flex-1 bg-background p-4">
// 				{/* TODO: sticky header once heading isn't visible? */}
// 				<Heading size="xl">Browse</Heading>

// 				<View className="mt-8 flex-1 gap-8">
// 					<View>
// 						<Text className="mb-3 text-foreground-muted">Favorites</Text>

// 						<View className="h-24 w-full items-center justify-center gap-2 rounded-lg border border-dashed border-edge p-3">
// 							<View className="relative flex justify-center">
// 								<View className="flex items-center justify-center rounded-lg bg-background-surface p-1.5">
// 									<Crown className="h-6 w-6 text-foreground-muted" />
// 									<Slash className="absolute h-6 w-6 scale-x-[-1] transform text-foreground opacity-80" />
// 								</View>
// 							</View>

// 							<Text>No favorites</Text>
// 						</View>
// 					</View>

// 					<View>
// 						<Text className="mb-3 text-foreground-muted">All</Text>

// 						{/* TODO: figure out spacing issues... */}
// 						<SimpleGrid
// 							fixed
// 							style={{ flex: 1 }}
// 							listKey={'browse-defaults'}
// 							itemDimension={itemDimension}
// 							data={sections}
// 							renderItem={({ item: { render } }) => <View className="pb-2">{render()}</View>}
// 							keyExtractor={(item) => item.title}
// 							spacing={ITEM_SPACING}
// 						/>
// 					</View>
// 				</View>
// 			</ScrollView>
// 		</View>
// 	)
// }
