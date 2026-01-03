import { FlashList } from '@shopify/flash-list'
import { useSDK } from '@stump/client'
import { OPDSFeedGroup, OPDSPublication } from '@stump/sdk'
import { STUMP_SAVE_BASIC_SESSION_HEADER } from '@stump/sdk/constants'
import { useRouter } from 'expo-router'
import { Rss } from 'lucide-react-native'
import { useCallback, useMemo } from 'react'
import { Pressable, View } from 'react-native'

import { useDisplay } from '~/lib/hooks'
import { cn } from '~/lib/utils'
import { usePreferencesStore } from '~/stores'

import { useActiveServer } from '../activeServer'
import { ThumbnailImage } from '../image'
import { ListEmptyMessage, Text } from '../ui'
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

	const renderItem = useCallback(
		({ item: publication }: { item: OPDSPublication }) => {
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
							<ThumbnailImage
								source={{
									uri: thumbnailURL || '',
									headers: {
										...sdk.customHeaders,
										Authorization: sdk.authorizationHeader || '',
										[STUMP_SAVE_BASIC_SESSION_HEADER]: 'false',
									},
								}}
								resizeMode="stretch"
								size={{ height: itemHeight, width: itemWidth }}
							/>

							<View>
								<Text className="mt-2" style={{ maxWidth: itemWidth - 4 }} numberOfLines={2}>
									{publication.metadata.title}
								</Text>
							</View>
						</View>
					)}
				</Pressable>
			)
		},
		[router, serverID, sdk, itemHeight, itemWidth],
	)

	if (!publications.length && !renderEmpty) return null

	return (
		<View>
			<View className="flex flex-row items-center justify-between px-4 pb-3">
				<Text className="text-xl font-medium leading-6 tracking-wide text-foreground">
					{metadata.title || 'Publications'}
				</Text>

				{selfURL && (
					<Pressable
						onPress={() =>
							selfURL
								? router.push({
										pathname: '/opds/[id]/feed/[url]',
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
				renderItem={renderItem}
				horizontal
				showsHorizontalScrollIndicator={false}
				contentContainerStyle={{ paddingHorizontal: 16 }}
			/>

			{!publications.length && <ListEmptyMessage icon={Rss} message="No publications in group" />}
		</View>
	)
}
