import { OPDSFeed } from '@stump/sdk'
import partition from 'lodash/partition'
import { View } from 'react-native'

import FeedSubtitle from './FeedSubtitle'
import Navigation from './Navigation'
import NavigationGroup from './NavigationGroup'
import PublicationGroup from './PublicationGroup'
import { FeedComponentOptions } from './types'

type Props = {
	feed: OPDSFeed
} & FeedComponentOptions

export default function FeedContent({ feed, ...options }: Props) {
	const [navGroups, publicationGroups] = partition(
		feed.groups.filter((group) => group.navigation.length || group.publications.length),
		(group) => group.publications.length === 0,
	)

	const hasContent =
		!!feed.metadata.subtitle ||
		feed.navigation.length > 0 ||
		navGroups.length > 0 ||
		publicationGroups.length > 0

	if (!hasContent) return null

	return (
		<View className="flex-1">
			{feed.metadata.subtitle && (
				<View className="px-4">
					<FeedSubtitle value={feed.metadata.subtitle} />
				</View>
			)}

			<View className="flex-1 gap-8 pt-4">
				<Navigation navigation={feed.navigation} {...options} />

				{publicationGroups.map((group) => (
					<PublicationGroup key={group.metadata.title} group={group} {...options} />
				))}

				{navGroups.map((group) => (
					<NavigationGroup key={group.metadata.title} group={group} {...options} />
				))}
			</View>
		</View>
	)
}
