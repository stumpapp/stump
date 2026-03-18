import { FlashList } from '@shopify/flash-list'
import { OPDSNavigationLink } from '@stump/sdk'
import { Fragment } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'

import { ON_END_REACHED_THRESHOLD } from '~/lib/constants'

import { Divider } from '../Divider'
import RefreshControl from '../RefreshControl'
import NavigationLink from './NavigationLink'

type Props = {
	navigation: OPDSNavigationLink[]
	hasNextPage: boolean
	fetchNextPage: () => void
	onRefresh?: () => void
	isRefreshing?: boolean
	ListHeaderComponent?: React.ReactElement
}

export default function NavigationFeed({
	navigation,
	hasNextPage,
	fetchNextPage,
	onRefresh,
	isRefreshing,
	ListHeaderComponent,
}: Props) {
	const onEndReached = () => {
		if (hasNextPage) {
			fetchNextPage()
		}
	}

	// Note: I did not use ItemSeparatorComponent bc it wouldn't render for last item
	// or lists of one
	const renderItem = ({ item }: { item: OPDSNavigationLink }) => {
		return (
			<Fragment>
				<NavigationLink link={item} />
				<Divider />
			</Fragment>
		)
	}

	if (!navigation.length) return null

	return (
		<SafeAreaView style={{ flex: 1 }} edges={['left', 'right']}>
			<FlashList
				data={navigation}
				keyExtractor={(item) => item.href}
				renderItem={renderItem}
				onEndReachedThreshold={ON_END_REACHED_THRESHOLD}
				onEndReached={onEndReached}
				contentInsetAdjustmentBehavior="always"
				ListHeaderComponent={ListHeaderComponent}
				ListHeaderComponentStyle={{ paddingBottom: 16 }}
				refreshControl={<RefreshControl refreshing={Boolean(isRefreshing)} onRefresh={onRefresh} />}
			/>
		</SafeAreaView>
	)
}
