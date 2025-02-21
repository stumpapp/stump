import { useSDK } from '@stump/client'
import { OPDSFeedGroup } from '@stump/sdk'
import { Image } from 'expo-image'
import { useRouter } from 'expo-router'
import { useMemo } from 'react'
import { FlatList, Pressable, View } from 'react-native'

import { useDisplay } from '~/lib/hooks'
import { cn } from '~/lib/utils'

import { useActiveServer } from '../activeServer'
import { Text } from '../ui'
import EmptyFeed from './EmptyFeed'
import { FeedComponentOptions } from './types'

type Props = {
	group: OPDSFeedGroup
} & FeedComponentOptions

export default function PublicationGroup({
	group: { metadata, links, publications },
	renderEmpty,
}: Props) {
	const selfURL = links?.find((link) => link.rel === 'self')?.href
	const router = useRouter()
	const {
		activeServer: { id: serverID },
	} = useActiveServer()
	const { sdk } = useSDK()
	const { isTablet } = useDisplay()

	const itemHeight = useMemo(() => (isTablet ? 225 : 150), [isTablet])
	const itemWidth = useMemo(() => itemHeight * (2 / 3), [itemHeight])

	if (!publications.length && !renderEmpty) return null

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
										pathname: '/opds/[id]/feed',
										params: {
											id: serverID,
											url: selfURL,
										},
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
											pathname: '/opds/[id]/publication',
											params: {
												id: serverID,
												url: selfURL,
											},
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
											onError={(e) => console.error({ error: e, thumbnailURL })}
											contentFit="fill"
											style={{ height: isTablet ? 225 : 150, width: itemWidth }}
										/>
									</View>

									<View>
										<Text className="mt-2" style={{ maxWidth: itemWidth - 4 }} numberOfLines={2}>
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
				showsHorizontalScrollIndicator={false}
			/>

			{!publications.length && <EmptyFeed message="No publications in group" />}
		</View>
	)
}
