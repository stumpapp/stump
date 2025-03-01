import { Header, ScrollHeaderProps, ScrollViewWithHeaders } from '@codeherence/react-native-header'
import { invalidateQueries, useSDK } from '@stump/client'
import { useRouter } from 'expo-router'
import { useCallback, useState } from 'react'
import { View } from 'react-native'
import { Pressable } from 'react-native-gesture-handler'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { ContinueReading } from '~/components/activeServer/home'
import RecentlyAddedBooks from '~/components/activeServer/home/RecentlyAddedBooks'
import RefreshControl from '~/components/RefreshControl'
import ScrollHeaderSurface from '~/components/ScrollHeaderSurface'
import { icons, Text } from '~/components/ui'
import { cn } from '~/lib/utils'

const { ChevronLeft } = icons

export default function Screen() {
	const { sdk } = useSDK()

	const [refreshing, setRefreshing] = useState(false)
	const onRefresh = useCallback(async () => {
		setRefreshing(true)
		await invalidateQueries({ keys: [sdk.media.keys.inProgress], exact: false })
		setRefreshing(false)
	}, [sdk])

	const router = useRouter()
	const insets = useSafeAreaInsets()

	const HeaderComponent = ({ showNavBar }: ScrollHeaderProps) => {
		return (
			<Header
				showNavBar={showNavBar}
				noBottomBorder
				headerStyle={{ height: 44 + insets.top }}
				headerLeftFadesIn
				headerLeft={
					<Pressable onPress={() => router.dismissAll()} style={{ flex: 1 }}>
						{({ pressed }) => (
							<View
								className={cn('flex-1 flex-row items-center gap-1 px-2', pressed && 'opacity-70')}
							>
								<ChevronLeft className="h-6 w-6 text-foreground" />
								<Text size="lg">Servers</Text>
							</View>
						)}
					</Pressable>
				}
				SurfaceComponent={ScrollHeaderSurface}
			/>
		)
	}

	return (
		<ScrollViewWithHeaders
			className="flex-1 bg-background p-4"
			HeaderComponent={HeaderComponent}
			disableLargeHeaderFadeAnim
			refreshControl={
				<RefreshControl refreshing={refreshing} onRefresh={onRefresh} style={{ zIndex: 100 }} />
			}
			style={{
				flex: 1,
				zIndex: -100,
				marginTop: -insets.top / 2,
			}}
		>
			<View className="flex flex-1 gap-8 pb-4">
				<ContinueReading />
				<RecentlyAddedBooks />
			</View>
		</ScrollViewWithHeaders>
	)
}
