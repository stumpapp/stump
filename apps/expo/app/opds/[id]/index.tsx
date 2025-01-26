import { useQuery, useSDK } from '@stump/client'
import { Image } from 'expo-image'
import { useRouter } from 'expo-router'
import partition from 'lodash/partition'
import { FlatList, Pressable, View } from 'react-native'
import { ScrollView } from 'react-native-gesture-handler'

import { useActiveServer } from '~/components/activeServer'
import { Heading, icons, Text } from '~/components/ui'
import { useDisplay } from '~/lib/hooks'
import { cn } from '~/lib/utils'

const { Rss, Slash, ChevronRight } = icons

export default function Screen() {
	const { activeServer } = useActiveServer()
	const { isTablet } = useDisplay()
	const { sdk } = useSDK()
	const { data: feed } = useQuery(
		[sdk.opds.keys.catalog, activeServer?.id],
		() => sdk.opds.catalog(),
		{
			suspense: true,
		},
	)

	const router = useRouter()

	if (!feed) return null

	const [browseGroups, publicationGroups] = partition(
		feed.groups.filter((group) => group.navigation.length || group.publications.length),
		(group) => group.publications.length === 0,
	)

	// TODO: componentize this
	// TODO: figure out how linking is going to work and swap out console.log
	return (
		<ScrollView className="flex-1 bg-background p-4">
			<View className="flex-1 gap-6 tablet:gap-8">
				<Heading size="lg" className="mt-6">
					{activeServer?.name || 'OPDS Feed'}
				</Heading>

				<View>
					<Text size="xl" className="font-medium">
						Browse
					</Text>
					{feed.navigation.map((link) => (
						<Pressable key={link.href} onPress={() => console.log(link.href)}>
							{({ pressed }) => (
								<View
									className={cn('flex-row items-center justify-between py-2 tablet:py-3', {
										'opacity-70': pressed,
									})}
								>
									<Text size="lg">{link.title}</Text>
									<ChevronRight size={20} className="text-foreground-muted" />
								</View>
							)}
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

				{browseGroups.map(({ metadata, navigation, links }) => {
					const selfURL = links.find((link) => link.rel === 'self')?.href

					return (
						<View key={metadata.title}>
							<View className="flex flex-row items-center justify-between pb-2">
								<Text size="xl" className="font-medium">
									{metadata.title || 'Browse'}
								</Text>

								{selfURL && (
									<Pressable
										onPress={() =>
											selfURL
												? router.push({
														pathname: `/opds/${activeServer.id}/feed`,
														params: { url: selfURL },
													})
												: null
										}
									>
										{({ pressed }) => (
											<View
												className={cn('text-center', {
													'opacity-80': pressed,
												})}
											>
												<Text className="text-fill-info">View all</Text>
											</View>
										)}
									</Pressable>
								)}
							</View>

							{navigation.map((link) => (
								<Pressable key={link.href} onPress={() => console.log(link.href)}>
									{({ pressed }) => (
										<View
											className={cn('flex-row items-center justify-between py-2 tablet:py-3', {
												'opacity-70': pressed,
											})}
										>
											<Text size="lg">{link.title}</Text>
											<ChevronRight size={20} className="text-foreground-muted" />
										</View>
									)}
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
					)
				})}

				{publicationGroups.map(({ metadata, publications, links }) => {
					const selfURL = links?.find((link) => link.rel === 'self')?.href

					return (
						<View key={metadata.title}>
							<View className="flex flex-row items-center justify-between pb-2">
								<Text className="text-xl font-medium text-foreground">
									{metadata.title || 'Publications'}
								</Text>

								{selfURL && (
									<Pressable
										onPress={() =>
											selfURL
												? router.push({
														pathname: `/opds/${activeServer.id}/feed`,
														params: { url: selfURL },
													})
												: null
										}
									>
										{({ pressed }) => (
											<View
												className={cn('text-center', {
													'opacity-80': pressed,
												})}
											>
												<Text className="text-fill-info">View all</Text>
											</View>
										)}
									</Pressable>
								)}
							</View>

							<FlatList
								data={publications}
								keyExtractor={({ metadata }) => metadata.title}
								renderItem={({ item: publication }) => {
									const thumbnailURL = publication.images?.at(0)?.href
									const selfURL = publication.links?.find((link) => link.rel === 'self')?.href

									return (
										<Pressable
											onPress={() =>
												selfURL
													? router.push({
															pathname: `/opds/${activeServer.id}/publication`,
															params: { url: selfURL },
														})
													: null
											}
										>
											{({ pressed }) => (
												<View
													className={cn('flex items-start px-1 tablet:px-2', {
														'opacity-90': pressed,
													})}
												>
													<View className="relative aspect-[2/3] overflow-hidden rounded-lg">
														<Image
															className="z-0"
															source={{
																uri: thumbnailURL,
																headers: {
																	Authorization: sdk.authorizationHeader,
																},
															}}
															contentFit="fill"
															style={{ height: isTablet ? 200 : 150, width: 'auto' }}
														/>
													</View>

													<View>
														<Text
															className="mt-2 line-clamp-2 text-sm tablet:text-sm"
															style={{ maxWidth: 150 * 0.75 }}
														>
															{publication.metadata.title}
														</Text>
													</View>
												</View>
											)}
										</Pressable>
									)
								}}
								horizontal
								pagingEnabled
								initialNumToRender={10}
								maxToRenderPerBatch={10}
							/>

							{!publications.length && (
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
					)
				})}
			</View>
		</ScrollView>
	)
}
