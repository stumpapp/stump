import { useQuery } from '@tanstack/react-query'
import { View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Heading } from '~/components/ui'
import { getAppUsage } from '~/lib/filesystem'

export default function Screen() {
	const { data } = useQuery(['app-usage'], getAppUsage, {
		suspense: true,
		cacheTime: 1000 * 60 * 5, // 5 minutes
		useErrorBoundary: false,
	})

	console.log(data)

	return (
		<SafeAreaView className="flex-1 bg-background">
			<View className="flex-1 gap-8 bg-background px-4">
				<Heading size="lg">Data Usage</Heading>
			</View>
		</SafeAreaView>
	)
}
