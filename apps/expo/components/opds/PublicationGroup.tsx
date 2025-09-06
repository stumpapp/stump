import { FlashList } from '@shopify/flash-list'
import { useSDK } from '@stump/client'
import { OPDSFeedGroup } from '@stump/sdk'
import { STUMP_SAVE_BASIC_SESSION_HEADER } from '@stump/sdk/constants'
import { useRouter } from 'expo-router'
import { useMemo } from 'react'
import { Pressable, View } from 'react-native'

import { useDisplay } from '~/lib/hooks'
import { cn } from '~/lib/utils'

import { useActiveServer } from '../activeServer'
import { FasterImage } from '../Image'
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

			<FlashList
				data={publications}
				keyExtractor={({ metadata }) => metadata.identifier || metadata.title}
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
									<View style={{ height: isTablet ? 225 : 150, width: itemWidth }}>
										<FasterImage
											source={{
												url: thumbnailURL || '',
												headers: {
													Authorization: sdk.authorizationHeader || '',
													[STUMP_SAVE_BASIC_SESSION_HEADER]: 'false',
												},
												resizeMode: 'cover',
												borderRadius: 8,
												cachePolicy: 'discWithCacheControl',
											}}
											style={{
												height: '100%',
												width: '100%',
											}}
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
				showsHorizontalScrollIndicator={false}
			/>

			{!publications.length && <EmptyFeed message="No publications in group" />}
		</View>
	)
}
