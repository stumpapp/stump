import { invalidateQueries, queryClient, useSDK } from '@stump/client'
import { useCallback, useState } from 'react'
import { ScrollView } from 'react-native-gesture-handler'

import { ContinueReading } from '~/components/activeServer/home'
import RefreshControl from '~/components/RefreshControl'

export default function Screen() {
	const { sdk } = useSDK()

	const [refreshing, setRefreshing] = useState(false)
	const onRefresh = useCallback(async () => {
		setRefreshing(true)
		await invalidateQueries({ keys: [sdk.media.keys.inProgress], exact: false })
		setRefreshing(false)
	}, [sdk])

	return (
		<ScrollView
			className="flex-1 gap-5 bg-background p-4"
			refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
		>
			<ContinueReading />
		</ScrollView>
	)
}
