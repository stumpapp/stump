import { useQuery, useSDK } from '@stump/client'
import { Image } from 'expo-image'
import partition from 'lodash/partition'
import { FlatList, Pressable, View } from 'react-native'
import { ScrollView } from 'react-native-gesture-handler'

import { useActiveServer } from '~/components/activeServer'
import { icons, Text } from '~/components/ui'

const { Rss, Slash, ChevronRight } = icons

export default function Screen() {
	const { activeServer } = useActiveServer()

	const { sdk } = useSDK()
	const { data: feed } = useQuery(
		[sdk.opds.keys.catalog, activeServer?.id],
		() => sdk.opds.catalog(),
		{
			suspense: true,
		},
	)

	if (!feed) return null

	const [browseGroups, publicationGroups] = partition(
		feed.groups.filter((group) => group.navigation.length || group.publications.length),
		(group) => group.publications.length === 0,
	)

	// TODO: componentize this
	// TODO: figure out style I like (the headings)
	return (
		<ScrollView className="flex-1 bg-background p-4">
			<View className="flex-1 gap-6">
				<Text className="mt-6 text-2xl font-bold leading-6">
					{activeServer?.name || 'OPDS Feed'}
				</Text>

				<View>
					<Text className="text-foreground-muted">Browse</Text>
					{feed.navigation.map((link) => (
						<Pressable
							key={link.href}
							className="flex-row items-center justify-between py-2"
							onPress={() => console.log(link.href)}
						>
							<Text className="text-lg">{link.title}</Text>

							<ChevronRight size={20} className="text-foreground-muted" />
						</Pressable>
					))}

					{!feed.navigation.length && (
						<View className="h-24 w-full items-center justify-center gap-2 rounded-lg border border-dashed border-edge p-3">
							<View className="relative flex justify-center">
								<View className="flex items-center justify-center rounded-lg bg-background-surface p-2">
									<Rss className="h-6 w-6 text-foreground-muted" />
									<Slash className="absolute h-6 w-6 scale-x-[-1] transform text-foreground opacity-80" />
								</View>
							</View>

							<Text>No navigation links in feed</Text>
						</View>
					)}
				</View>

				{browseGroups.map((group) => (
					<View key={group.metadata.title}>
						<Text className="text-xl font-medium text-foreground">
							{group.metadata.title || 'Browse'}
						</Text>
						{group.navigation.map((link) => (
							<Pressable
								key={link.href}
								className="flex-row items-center justify-between py-2"
								onPress={() => console.log(link.href)}
							>
								<Text className="text-lg">{link.title}</Text>

								<ChevronRight size={20} className="text-foreground-muted" />
							</Pressable>
						))}

						{!feed.navigation.length && (
							<View className="h-24 w-full items-center justify-center gap-2 rounded-lg border border-dashed border-edge p-3">
								<View className="relative flex justify-center">
									<View className="flex items-center justify-center rounded-lg bg-background-surface p-2">
										<Rss className="h-6 w-6 text-foreground-muted" />
										<Slash className="absolute h-6 w-6 scale-x-[-1] transform text-foreground opacity-80" />
									</View>
								</View>

								<Text>No navigation links in feed</Text>
							</View>
						)}
					</View>
				))}

				{publicationGroups.map((group) => (
					<View key={group.metadata.title}>
						<Text className="pb-2 text-xl font-medium text-foreground">
							{group.metadata.title || 'Publications'}
						</Text>

						<FlatList
							data={group.publications}
							keyExtractor={({ metadata }) => metadata.title}
							renderItem={({ item: publication }) => (
								<View className="flex items-start px-1">
									<View className="relative aspect-[2/3] overflow-hidden rounded-lg">
										<Image
											className="z-0"
											source={{
												uri: publication.images?.at(0)?.href,
												headers: {
													Authorization: sdk.authorizationHeader,
												},
											}}
											contentFit="fill"
											style={{ height: 150, width: 'auto' }}
										/>
									</View>

									<View>
										<Text className="mt-2 line-clamp-2 text-sm" style={{ maxWidth: 150 * 0.75 }}>
											{publication.metadata.title}
										</Text>
									</View>
								</View>
							)}
							horizontal
							pagingEnabled
							initialNumToRender={10}
							maxToRenderPerBatch={10}
						/>

						{!group.publications.length && (
							<View className="h-24 w-full items-center justify-center gap-2 rounded-lg border border-dashed border-edge p-3">
								<View className="relative flex justify-center">
									<View className="flex items-center justify-center rounded-lg bg-background-surface p-2">
										<Rss className="h-6 w-6 text-foreground-muted" />
										<Slash className="absolute h-6 w-6 scale-x-[-1] transform text-foreground opacity-80" />
									</View>
								</View>

								<Text>No publications in group</Text>
							</View>
						)}
					</View>
				))}
			</View>
		</ScrollView>
	)
}
