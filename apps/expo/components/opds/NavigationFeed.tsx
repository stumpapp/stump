import { FlashList } from '@shopify/flash-list'
import { useSDK } from '@stump/client'
import { OPDSNavigationLink, resolveUrl } from '@stump/sdk'
import { useRouter } from 'expo-router'
import { ChevronRight } from 'lucide-react-native'
import { Pressable, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { ON_END_REACHED_THRESHOLD } from '~/lib/constants'
import { cn } from '~/lib/utils'

import { useActiveServer } from '../activeServer'
import RefreshControl from '../RefreshControl'
import { Card, Text } from '../ui'
import { Icon } from '../ui/icon'

type Props = {
	navigation: OPDSNavigationLink[]
	hasNextPage: boolean
	fetchNextPage: () => void
	label?: string
	onRefresh?: () => void
	isRefreshing?: boolean
	ListHeaderComponent?: React.ReactElement
}

export default function NavigationFeed({
	navigation,
	hasNextPage,
	fetchNextPage,
	label,
	onRefresh,
	isRefreshing,
	ListHeaderComponent,
}: Props) {
	const router = useRouter()
	const { sdk } = useSDK()
	const {
		activeServer: { id: serverID },
	} = useActiveServer()

	const onEndReached = () => {
		if (hasNextPage) {
			fetchNextPage()
		}
	}

	const renderItem = ({ item }: { item: OPDSNavigationLink }) => {
		return (
			<Pressable
				onPress={() =>
					router.push({
						pathname: '/opds/[id]/feed/[url]',
						params: { id: serverID, url: resolveUrl(item.href, sdk.rootURL) },
					})
				}
			>
				{({ pressed }) => (
					<Card.Row label={item.title} style={pressed && { opacity: 0.6 }} renderDivider={false}>
						<Icon as={ChevronRight} className="h-5 w-5 shrink-0 text-foreground-muted" />
					</Card.Row>
				)}
			</Pressable>
		)
	}

	if (!navigation.length) return null

	const header = (
		<View>
			{ListHeaderComponent}
			{label && (
				<Text size="lg" className="px-4 pb-2 pt-4 font-medium text-foreground-muted">
					{label}
				</Text>
			)}
		</View>
	)

	return (
		<SafeAreaView style={{ flex: 1 }} edges={['left', 'right']}>
			<FlashList
				data={navigation}
				keyExtractor={(item) => item.href}
				renderItem={renderItem}
				onEndReachedThreshold={ON_END_REACHED_THRESHOLD}
				onEndReached={onEndReached}
				contentInsetAdjustmentBehavior="always"
				ListHeaderComponent={header}
				contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}
				refreshControl={<RefreshControl refreshing={Boolean(isRefreshing)} onRefresh={onRefresh} />}
				CellRendererComponent={({ children, index, style, ...props }) => (
					<View
						style={style}
						className={cn(
							'bg-black/5 dark:bg-white/10',
							index === 0 && 'squircle ios:rounded-t-[2rem] overflow-hidden rounded-t-3xl',
							index === navigation.length - 1 &&
								'squircle ios:rounded-b-[2rem] overflow-hidden rounded-b-3xl',
						)}
						{...props}
					>
						{children}
					</View>
				)}
				ItemSeparatorComponent={() => <Card.RowDivider />}
			/>
		</SafeAreaView>
	)
}
