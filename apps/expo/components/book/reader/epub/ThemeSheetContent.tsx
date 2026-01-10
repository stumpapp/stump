import { useRef } from 'react'
import { ScrollView, View } from 'react-native'
import PagerView from 'react-native-pager-view'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { Brightness, FontConfig, PublisherStyles, ThemeSelect } from './controls'
import { CustomizeTheme, ThemeHeaderPreview } from './controls/customTheme'

export default function ThemeSheetContent() {
	const pagerRef = useRef<PagerView>(null)

	const insets = useSafeAreaInsets()

	return (
		<PagerView ref={pagerRef} initialPage={0} style={{ flex: 1 }} scrollEnabled={false}>
			<View className="flex-1 bg-background" key="0">
				<ThemeHeaderPreview />

				<ScrollView
					contentContainerStyle={{
						padding: 0,
						paddingTop: 32,
						paddingBottom: insets.bottom,
						gap: 32,
					}}
				>
					<Brightness />

					<ThemeSelect onCustomizePress={() => pagerRef.current?.setPage(1)} />

					<FontConfig />

					<PublisherStyles />
				</ScrollView>
			</View>

			<View className="flex-1 gap-8" key="1">
				<CustomizeTheme onCancel={() => pagerRef.current?.setPage(0)} />
			</View>
		</PagerView>
	)
}
