import { useRef, useState } from 'react'
import { ScrollView, View } from 'react-native'
import PagerView from 'react-native-pager-view'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { Card } from '~/components/ui'

import {
	Brightness,
	ColumnCount,
	FontConfig,
	ImageFilter,
	PageMargins,
	PublisherStyles,
	ReadingProgression,
	ThemeSelect,
	TypographySettings,
} from './controls'
import { CustomizeTheme, ThemeHeaderPreview } from './controls/customTheme'

export default function ThemeSheetContent() {
	const pagerRef = useRef<PagerView>(null)
	const insets = useSafeAreaInsets()
	const [themeMode, setThemeMode] = useState<'edit' | 'create'>('edit')

	const openCustomizeTheme = (mode: 'edit' | 'create') => {
		setThemeMode(mode)
		pagerRef.current?.setPage(1)
	}

	const closeCustomizeTheme = () => {
		pagerRef.current?.setPage(0)
	}

	// FIXME: The settings after ThemeSelect on iOS are having really wonky issues that
	// are honestly kinda fucking annoying at this point lol. It seems some of them break in
	// alignment randomly, adding a View container around the native element fixes it (sometimes)
	// but then breaks other rows. It's killing me. I'm ignoring it for now but AHH
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

					<View className="gap-y-8 px-4">
						<Card className="squircle flex rounded-2xl border border-edge bg-background-surface">
							<FontConfig />
						</Card>

						<Card className="squircle flex rounded-2xl border border-edge bg-background-surface">
							<ReadingProgression />
							<View className="h-px w-full bg-edge" />
							<ColumnCount />
							<View className="h-px w-full bg-edge" />
							<PageMargins />
						</Card>

						<Card className="squircle flex rounded-2xl border border-edge bg-background-surface">
							<ImageFilter />
						</Card>

						<Card className="squircle flex rounded-2xl border border-edge bg-background-surface">
							<PublisherStyles />
							<View className="h-px w-full bg-edge" />
							<TypographySettings />
						</Card>
					</View>
				</ScrollView>
			</View>

			<View className="flex-1 gap-8" key="1">
				<CustomizeTheme onCancel={closeCustomizeTheme} mode={themeMode} />
			</View>
		</PagerView>
	)
}
