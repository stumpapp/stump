import { FlashList } from '@shopify/flash-list'
import { useSDK } from '@stump/client'
import { OPDSFeed, OPDSFeedGroup, OPDSPublication } from '@stump/sdk'
import { STUMP_SAVE_BASIC_SESSION_HEADER } from '@stump/sdk/constants'
import { keepPreviousData, useInfiniteQuery } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import { Rss } from 'lucide-react-native'
import { useCallback, useMemo } from 'react'
import { Pressable, View } from 'react-native'

import { useListItemSize } from '~/lib/hooks'
import { cn } from '~/lib/utils'

import { useActiveServer } from '../activeServer'
import { ThumbnailImage } from '../image'
import { ListEmptyMessage, ListLabel, Text } from '../ui'
import FeedSelfURL from './FeedSelfURL'
import { FeedComponentOptions } from './types'
import { hasLinkRel, useResolveURL } from './utils'

type Props = {
	group: OPDSFeedGroup
} & FeedComponentOptions

export default function PublicationGroup({
	group: { metadata, links, publications: initialPublications },
	// eslint-disable-next-line react/prop-types
	renderEmpty,
}: Props) {
	const selfURL = links?.find((link) => hasLinkRel(link, 'self'))?.href
	const hasGroupPagination = links?.some((link) => hasLinkRel(link, 'next'))
	const router = useRouter()
	const {
		activeServer: { id: serverID },
	} = useActiveServer()
	const { sdk } = useSDK()
	const { width, height, horizontalGap } = useListItemSize()

	const resolveUrl = useResolveURL()

	const {
		data: paginatedData,
		hasNextPage,
		fetchNextPage,
	} = useInfiniteQuery({
		initialPageParam: selfURL,
		queryKey: [sdk.opds.keys.feed, selfURL, 'group-publications'],
		queryFn: ({ pageParam }) => sdk.opds.feed(pageParam || selfURL || ''),
		placeholderData: keepPreviousData,
		getNextPageParam: (lastPage: OPDSFeed) => {
			const nextLink = lastPage.links?.find((link) => hasLinkRel(link, 'next'))
			return nextLink?.href
		},
		enabled: !!selfURL && !!hasGroupPagination,
	})

	const publications = useMemo(
		() => paginatedData?.pages.flatMap((page) => page.publications) ?? initialPublications,
		[paginatedData, initialPublications],
	)

	const onEndReached = useCallback(() => {
		if (hasNextPage) {
			fetchNextPage()
		}
	}, [hasNextPage, fetchNextPage])

	const renderItem = useCallback(
		({ item: publication }: { item: OPDSPublication }) => {
			const thumbnailURL = publication.images?.at(0)?.href
				? resolveUrl(publication.images.at(0)!.href)
				: undefined
			const selfURL = publication.links?.find((link) => hasLinkRel(link, 'self'))?.href

			return (
				<Pressable
					onPress={() =>
						selfURL
							? router.push({
									pathname: '/opds/[id]/publication',
									params: {
										id: serverID,
										url: resolveUrl(selfURL),
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
								size={{ height, width }}
							/>

							<View>
								<Text className="mt-2" style={{ maxWidth: width - 4 }} numberOfLines={2}>
									{publication.metadata.title}
								</Text>
							</View>
						</View>
					)}
				</Pressable>
			)
		},
		[router, serverID, sdk, width, height, resolveUrl],
	)

	if (!publications.length && !renderEmpty) return null

	// TODO: Not 100% on using the ListLabel's here, but I don't necessarily want to use
	// the Heading here like Stump home screen does. At least this will be inline with the
	// card list sections
	return (
		<View>
			<View className="flex flex-row items-center justify-between px-4 pb-3">
				<ListLabel className="ios:px-4 px-2">{metadata.title || 'Publications'}</ListLabel>

				{selfURL && <FeedSelfURL url={selfURL} />}
			</View>

			<FlashList
				data={publications}
				keyExtractor={({ metadata }) => metadata.identifier || metadata.title}
				renderItem={renderItem}
				horizontal
				showsHorizontalScrollIndicator={false}
				contentContainerStyle={{ paddingHorizontal: 16 }}
				onEndReached={onEndReached}
				onEndReachedThreshold={0.5}
				ItemSeparatorComponent={() => <View style={{ width: horizontalGap }} />}
			/>

			{!publications.length && <ListEmptyMessage icon={Rss} message="No publications in group" />}
		</View>
	)
}
