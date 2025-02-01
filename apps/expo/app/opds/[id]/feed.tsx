import { useQuery, useSDK } from '@stump/client'
import { useLocalSearchParams } from 'expo-router'
import { SafeAreaView } from 'react-native'
import { ScrollView } from 'react-native-gesture-handler'

import { OPDSFeed, OPDSPublicationFeed } from '~/components/opds'

export default function Screen() {
	const { url: feedURL } = useLocalSearchParams<{ url: string }>()
	const { sdk } = useSDK()

	const { data: feed } = useQuery([sdk.opds.keys.feed, feedURL], () => sdk.opds.feed(feedURL), {
		suspense: true,
	})

	if (!feed) return null

	const allGroupsEmpty = feed.groups.every(
		(group) => !group.navigation.length && !group.publications.length,
	)
	const isPublicationFeed = feed.publications.length > 0

	const renderContent = () => {
		if (isPublicationFeed) {
			return <OPDSPublicationFeed feed={feed} />
		} else {
			return (
				<ScrollView className="flex-1 gap-5 bg-background px-6">
					<OPDSFeed feed={feed} />
				</ScrollView>
			)
		}
	}

	return (
		<SafeAreaView className="flex-1 bg-background">
			{/* <ScrollView className="flex-1 gap-5 bg-background px-6">
				<OPDSFeed feed={feed} />
			</ScrollView> */}
			{renderContent()}
		</SafeAreaView>
	)
}
