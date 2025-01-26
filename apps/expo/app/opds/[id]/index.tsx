import { useQuery, useSDK } from '@stump/client'
import { ScrollView } from 'react-native-gesture-handler'

import { useActiveServer } from '~/components/activeServer'
import { Text } from '~/components/ui'

export default function Screen() {
	const { activeServer } = useActiveServer()

	const { sdk } = useSDK()
	const { data: feed } = useQuery(
		[sdk.opds.keys.catalog, activeServer?.id],
		() => sdk.opds.catalog(),
		{
			suspense: true,
		},
	)

	console.log(feed)

	return (
		<ScrollView className="flex-1 gap-5 bg-background p-4">
			<Text className="mt-6 text-2xl font-bold leading-6">{activeServer?.name || 'OPDS Feed'}</Text>
		</ScrollView>
	)
}
