import { useSDK } from '@stump/client'
import { OPDSFeed, OPDSFeedGroup, OPDSNavigationLink } from '@stump/sdk'
import { keepPreviousData, useInfiniteQuery } from '@tanstack/react-query'
import { Rss } from 'lucide-react-native'
import { Fragment, useCallback, useMemo } from 'react'
import { View } from 'react-native'

import { Divider } from '../Divider'
import { ListEmptyMessage, Text } from '../ui'
import FeedSelfURL from './FeedSelfURL'
import NavigationLink from './NavigationLink'
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

	const resolveUrl = useResolveURL()

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
		<View key={metadata.title}>
			<View className="flex flex-row items-center justify-between px-4 pb-2">
				<Text size="xl" className="font-medium leading-6 tracking-wide">
					{metadata.title || 'Browse'}
				</Text>

				{selfURL && <FeedSelfURL url={resolveUrl(selfURL)} />}
			</View>

			{navigation.map((link) => (
				<Fragment key={link.href}>
					<NavigationLink link={link} />
					<Divider />
				</Fragment>
			))}

			{!navigation.length && <ListEmptyMessage icon={Rss} message="No navigation links in group" />}
		</View>
	)
}
