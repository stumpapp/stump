import { UserPermission } from '@stump/graphql'
import { useMemo } from 'react'
import { useWindowDimensions, View } from 'react-native'
import { ScrollView } from 'react-native-gesture-handler'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { SimpleGrid } from 'react-native-super-grid'

import { useStumpServer } from '~/components/activeServer'
import { StackedBookThumbnails } from '~/components/book'
import { StackedLibraryThumbnails } from '~/components/library'
import { StackedSeriesThumbnails } from '~/components/series'
import { StackedSmartListThumbnails } from '~/components/smartList'
import { Heading, icons, Text } from '~/components/ui'
const { Crown, Slash } = icons

const ITEM_SPACING = 10

export default function Screen() {
	const { width } = useWindowDimensions()
	const {
		activeServer: { id: serverID },
		checkPermission,
	} = useStumpServer()

	const insets = useSafeAreaInsets()
	const showSmartLists = checkPermission(UserPermission.AccessSmartList)
	// iPad or other large screens can have more columns (i.e., smaller itemDimension) but most phones should have 2 columns
	const isTablet = useMemo(() => width > 768, [width])
	const itemDimension = useMemo(
		() =>
			width /
				// 2 columns on phones
				(isTablet ? 4 : 2) -
			16 * 2, // 16px padding on each side
		[isTablet, width],
	)

	const sections = useMemo(
		() => [
			{
				title: 'Libraries',
				href: `/server/${serverID}/libraries`,
				render: () => <StackedLibraryThumbnails />,
			},
			{
				title: 'Series',
				href: `/server/${serverID}/series`,
				render: () => <StackedSeriesThumbnails />,
			},
			{
				title: 'Books',
				href: `/server/${serverID}/books`,
				render: () => <StackedBookThumbnails />,
			},
			...(showSmartLists
				? [
						{
							title: 'Smart Lists',
							href: `/server/${serverID}/smart-lists`,
							render: () => <StackedSmartListThumbnails />,
						},
					]
				: []),
		],
		[serverID, showSmartLists],
	)

	return (
		<View
			className="flex-1 bg-background"
			style={{
				paddingTop: insets.top,
			}}
		>
			<ScrollView className="flex-1 bg-background p-4">
				{/* TODO: sticky header once heading isn't visible? */}
				<Heading size="xl">Browse</Heading>

				<View className="mt-8 flex-1 gap-8">
					<View>
						<Text className="mb-3 text-foreground-muted">Favorites</Text>

						<View className="h-24 w-full items-center justify-center gap-2 rounded-lg border border-dashed border-edge p-3">
							<View className="relative flex justify-center">
								<View className="flex items-center justify-center rounded-lg bg-background-surface p-1.5">
									<Crown className="h-6 w-6 text-foreground-muted" />
									<Slash className="absolute h-6 w-6 scale-x-[-1] transform text-foreground opacity-80" />
								</View>
							</View>

							<Text>No favorites</Text>
						</View>
					</View>

					<View>
						<Text className="mb-3 text-foreground-muted">All</Text>

						{/* TODO: figure out spacing issues... */}
						<SimpleGrid
							fixed
							style={{ flex: 1 }}
							listKey={'browse-defaults'}
							itemDimension={itemDimension}
							data={sections}
							renderItem={({ item: { render } }) => <View className="pb-2">{render()}</View>}
							keyExtractor={(item) => item.title}
							spacing={ITEM_SPACING}
						/>
					</View>
				</View>
			</ScrollView>
		</View>
	)
}
