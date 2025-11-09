import { FlashList } from '@shopify/flash-list'
import { useSDK } from '@stump/client'
import { OPDSFeedGroup } from '@stump/sdk'
import { STUMP_SAVE_BASIC_SESSION_HEADER } from '@stump/sdk/constants'
import { useRouter } from 'expo-router'
import { useMemo } from 'react'
import { Pressable, View } from 'react-native'

import { useDisplay } from '~/lib/hooks'
import { cn } from '~/lib/utils'
import { usePreferencesStore } from '~/stores'

import { useActiveServer } from '../activeServer'
import { BorderAndShadow } from '../BorderAndShadow'
import { TurboImage } from '../Image'
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
	const thumbnailRatio = usePreferencesStore((state) => state.thumbnailRatio)

	const itemWidth = useMemo(() => (isTablet ? 150 : 100), [isTablet])
	const itemHeight = useMemo(() => itemWidth / thumbnailRatio, [itemWidth, thumbnailRatio])

	if (!publications.length && !renderEmpty) return null

	return (
		<View key={metadata.title}>
			<View className="flex flex-row items-center justify-between pb-3">
				<Text className="px-4 text-xl font-medium leading-6 tracking-wide text-foreground">
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
										'opacity-80': pressed,
									})}
								>
									<BorderAndShadow
										style={{ borderRadius: 6, borderWidth: 0.3, shadowRadius: 1.41, elevation: 2 }}
									>
										<View style={{ height: itemHeight, width: itemWidth }}>
											<TurboImage
												source={{
													uri: thumbnailURL || '',
													headers: {
														...sdk.customHeaders,
														Authorization: sdk.authorizationHeader || '',
														[STUMP_SAVE_BASIC_SESSION_HEADER]: 'false',
													},
												}}
												resizeMode="stretch"
												resize={itemWidth * 1.5}
												style={{ height: '100%', width: '100%' }}
											/>
										</View>
									</BorderAndShadow>

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
				contentContainerStyle={{ paddingHorizontal: 16 }}
			/>

			{!publications.length && <EmptyFeed message="No publications in group" />}
		</View>
	)
}
