import { OPDSFeedGroup } from '@stump/sdk'
import { Rss } from 'lucide-react-native'
import { Fragment } from 'react'
import { View } from 'react-native'

import { Divider } from '../Divider'
import { ListEmptyMessage, Text } from '../ui'
import FeedSelfURL from './FeedSelfURL'
import NavigationLink from './NavigationLink'
import { FeedComponentOptions } from './types'
import { useResolveURL } from './utils'

type Props = {
	group: OPDSFeedGroup
} & FeedComponentOptions

export default function NavigationGroup({
	group: { metadata, links, navigation },
	renderEmpty,
}: Props) {
	const selfURL = links.find((link) => link.rel === 'self')?.href

	const resolveUrl = useResolveURL()

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
