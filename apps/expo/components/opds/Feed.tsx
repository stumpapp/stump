import { OPDSFeed } from '@stump/sdk'
import partition from 'lodash/partition'
import { View } from 'react-native'

import MaybeErrorFeed from './MaybeErrorFeed'
import Navigation from './Navigation'
import NavigationGroup from './NavigationGroup'
import PublicationFeed from './PublicationFeed'
import PublicationGroup from './PublicationGroup'
import { FeedComponentOptions } from './types'
import { useFeedTitle } from './useFeedTitle'

type Props = {
	feed: OPDSFeed
} & FeedComponentOptions

export default function Feed({ feed, ...options }: Props) {
	useFeedTitle(feed)

	const [navGroups, publicationGroups] = partition(
		feed.groups.filter((group) => group.navigation.length || group.publications.length),
		(group) => group.publications.length === 0,
	)

	if (!navGroups.length && !publicationGroups.length && !feed.navigation.length) {
		return <MaybeErrorFeed />
	}

	return (
		<View className="flex-1 gap-8 pt-4">
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
