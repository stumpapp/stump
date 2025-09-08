import { OPDSFeedGroup } from '@stump/sdk'
import { Fragment } from 'react'
import { View } from 'react-native'

import { Text } from '../ui'
import EmptyFeed from './EmptyFeed'
import FeedSelfURL from './FeedSelfURL'
import NavigationLink from './NavigationLink'
import { FeedComponentOptions } from './types'

type Props = {
	group: OPDSFeedGroup
} & FeedComponentOptions

export default function NavigationGroup({
	group: { metadata, links, navigation },
	renderEmpty,
}: Props) {
	const selfURL = links.find((link) => link.rel === 'self')?.href

	if (!navigation.length && !renderEmpty) return null

	return (
		<View key={metadata.title}>
			<View className="flex flex-row items-center justify-between pb-2">
				<Text size="xl" className="font-medium leading-6 tracking-wide">
					{metadata.title || 'Browse'}
				</Text>

				{selfURL && <FeedSelfURL url={selfURL} />}
			</View>

			{navigation.map((link) => (
				<Fragment key={link.href}>
					<NavigationLink link={link} />
					<Divider />
				</Fragment>
			))}

			{!navigation.length && <EmptyFeed message="No navigation links in group" />}
		</View>
	)
}

const Divider = () => <View className="h-px w-full bg-edge" />
