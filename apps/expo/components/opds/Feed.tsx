import { OPDSFeed } from '@stump/sdk'
import partition from 'lodash/partition'
import { View } from 'react-native'

import FeedTitle from './FeedTitle'
import MaybeErrorFeed from './MaybeErrorFeed'
import Navigation from './Navigation'
import NavigationGroup from './NavigationGroup'
import PublicationFeed from './PublicationFeed'
import PublicationGroup from './PublicationGroup'
import { FeedComponentOptions } from './types'

type Props = {
	feed: OPDSFeed
} & FeedComponentOptions

export default function Feed({ feed, ...options }: Props) {
	const [navGroups, publicationGroups] = partition(
		feed.groups.filter((group) => group.navigation.length || group.publications.length),
		(group) => group.publications.length === 0,
	)

	if (!navGroups.length && !publicationGroups.length && !feed.navigation.length) {
		return <MaybeErrorFeed />
	}

	return (
		<View className="flex-1 gap-8">
			<FeedTitle feed={feed} />

			<Navigation navigation={feed.navigation} {...options} />

			{publicationGroups.map((group) => (
				<PublicationGroup key={group.metadata.title} group={group} {...options} />
			))}

			{navGroups.map((group) => (
				<NavigationGroup key={group.metadata.title} group={group} {...options} />
			))}

			<PublicationFeed feed={feed} />
		</View>
	)
}
