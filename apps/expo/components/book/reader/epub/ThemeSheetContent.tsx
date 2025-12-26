import { useRef, useState } from 'react'
import { ScrollView, View } from 'react-native'
import PagerView from 'react-native-pager-view'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { useReaderStore } from '~/stores'

import {
	Brightness,
	ColumnCount,
	FontConfig,
	ImageFilter,
	PageMargins,
	PublisherStyles,
	ThemeSelect,
	TypographySettings,
} from './controls'
import { CustomizeTheme, ThemeHeaderPreview } from './controls/customTheme'

export default function ThemeSheetContent() {
	const pagerRef = useRef<PagerView>(null)
	const insets = useSafeAreaInsets()

	const publisherStyles = useReaderStore((state) => state.globalSettings.allowPublisherStyles)
	const [themeMode, setThemeMode] = useState<'edit' | 'create'>('edit')

	const openCustomizeTheme = (mode: 'edit' | 'create') => {
		setThemeMode(mode)
		pagerRef.current?.setPage(1)
	}

	const closeCustomizeTheme = () => {
		pagerRef.current?.setPage(0)
	}

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

					<ThemeSelect
						onCustomizePress={() => openCustomizeTheme('edit')}
						onNewThemePress={() => openCustomizeTheme('create')}
					/>

					<FontConfig />

					<PublisherStyles />

					<PageMargins />

					<ColumnCount />

					<ImageFilter />

					{!publisherStyles && <TypographySettings />}
				</ScrollView>
			</View>

			<View className="flex-1 gap-8" key="1">
				<CustomizeTheme onCancel={closeCustomizeTheme} mode={themeMode} />
			</View>
		</PagerView>
	)
}
