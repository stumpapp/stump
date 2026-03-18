import { useSDK } from '@stump/client'
import { OPDSFeed, OPDSFeedGroup, resolveUrl } from '@stump/sdk'
import { keepPreviousData, useInfiniteQuery } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import { ChevronRight, Rss } from 'lucide-react-native'
import { useMemo } from 'react'
import { Pressable, View } from 'react-native'

import { useActiveServer } from '../activeServer'
import { Card, ListEmptyMessage } from '../ui'
import { Icon } from '../ui/icon'
import FeedSelfURL from './FeedSelfURL'
import { FeedComponentOptions } from './types'
import { hasLinkRel, useResolveURL } from './utils'

type Props = {
	group: OPDSFeedGroup
} & FeedComponentOptions

export default function NavigationGroup({
	group: { metadata, links, navigation: initialNavigation },
	renderEmpty,
}: Props) {
	const selfURL = links.find((link) => hasLinkRel(link, 'self'))?.href
	const hasGroupPagination = links.some((link) => hasLinkRel(link, 'next'))
	const { sdk } = useSDK()
	const router = useRouter()
	const {
		activeServer: { id: serverID },
	} = useActiveServer()

	const resolveUrl_ = useResolveURL()

	const { data: paginatedData } = useInfiniteQuery({
		initialPageParam: selfURL,
		queryKey: [sdk.opds.keys.feed, selfURL, 'group-navigation'],
		queryFn: ({ pageParam }) => sdk.opds.feed(pageParam || selfURL || ''),
		placeholderData: keepPreviousData,
		getNextPageParam: (lastPage: OPDSFeed) => {
			const nextLink = lastPage.links?.find((link) => hasLinkRel(link, 'next'))
			return nextLink?.href
		},
		enabled: !!selfURL && !!hasGroupPagination,
	})

	const navigation = useMemo(
		() => paginatedData?.pages.flatMap((page) => page.navigation) ?? initialNavigation,
		[paginatedData, initialNavigation],
	)

	if (!navigation.length && !renderEmpty) return null

	return (
		<View className="px-4">
			<View className="flex flex-row items-center justify-between pb-2">
				<Card
					label={metadata.title || 'Browse'}
					actions={selfURL ? <FeedSelfURL url={resolveUrl_(selfURL)} /> : undefined}
					className="flex-1"
				>
					{navigation.map((link) => (
						<Pressable
							key={link.href}
							onPress={() =>
								router.push({
									pathname: '/opds/[id]/feed/[url]',
									params: { id: serverID, url: resolveUrl(link.href, sdk.rootURL) },
								})
							}
						>
							{({ pressed }) => (
								<Card.Row label={link.title} style={pressed && { opacity: 0.6 }}>
									<Icon as={ChevronRight} className="h-5 w-5 shrink-0 text-foreground-muted" />
								</Card.Row>
							)}
						</Pressable>
					))}
				</Card>
			</View>

			{!navigation.length && <ListEmptyMessage icon={Rss} message="No navigation links in group" />}
		</View>
	)
}
