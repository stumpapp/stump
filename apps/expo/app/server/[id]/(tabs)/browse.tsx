import { useRouter } from 'expo-router'
import { useMemo } from 'react'
import { Pressable, useWindowDimensions, View } from 'react-native'
import { ScrollView } from 'react-native-gesture-handler'
import { SimpleGrid } from 'react-native-super-grid'

import { useActiveServer } from '~/components/activeServer'
import { icons, Text } from '~/components/ui'
const { Crown, Slash } = icons

export default function Screen() {
	const { width } = useWindowDimensions()
	const {
		activeServer: { id: serverID },
	} = useActiveServer()
	const router = useRouter()

	// iPad or other large screens can have more columns (i.e., smaller itemDimension) but most phones should have 2 columns
	const isTablet = useMemo(() => width > 768, [width])
	const itemDimension = useMemo(
		() =>
			width /
				// 2 columns on phones
				(isTablet ? 4 : 2) -
			16 * 2,
		[isTablet, width],
	)

	return (
		<ScrollView className="flex-1 overflow-scroll bg-background p-4">
			<View className="flex-1 gap-8">
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

					<SimpleGrid
						listKey={'browse-defaults'}
						itemDimension={itemDimension}
						data={[
							{
								title: 'Libraries',
								href: `/server/${serverID}/libraries`,
							},
							{
								title: 'Series',
								href: `/server/${serverID}/series`,
							},
							{
								title: 'Books',
								href: `/server/${serverID}/books`,
							},
							{
								title: 'Smart Lists',
								href: `/server/${serverID}/smart-lists`,
							},
						]}
						renderItem={({ item }) => (
							// @ts-expect-error: The URLs exist I promise
							<Pressable className="flex-1" onPress={() => router.push(item.href)}>
								<View className="relative h-40 w-full rounded-lg bg-background-surface">
									<View className="absolute bottom-0 left-0 right-0 top-0 flex items-center justify-center rounded-lg bg-background-surface p-1.5">
										<Text className="text-foreground-muted">{item.title}</Text>
									</View>
								</View>
							</Pressable>
						)}
						keyExtractor={(item) => item.title}
						// We need to fetch more items when we reach the end of the list
					/>
				</View>
			</View>
		</ScrollView>
	)
}
