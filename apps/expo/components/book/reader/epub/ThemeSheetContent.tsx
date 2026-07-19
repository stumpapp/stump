import { View } from 'react-native'

import { Card } from '~/components/ui'

import {
	Brightness,
	ColumnCount,
	FontConfig,
	ImageFilter,
	PageMargins,
	ReadingProgression,
	ThemeSelect,
	TypographySettings,
	VolumeNavigation,
} from './controls'

export default function ThemeSheetContent() {
	// FIXME: The settings after ThemeSelect on iOS are having really wonky issues that
	// are honestly kinda fucking annoying at this point lol. It seems some of them break in
	// alignment randomly, adding a View container around the native element fixes it (sometimes)
	// but then breaks other rows. It's killing me. I'm ignoring it for now but AHH
	return (
		<View className="gap-8 py-3 android:pb-12 flex-1">
			<Brightness />

			<ThemeSelect />

			<FontConfig />

			<Card>
				<ReadingProgression />
				<ColumnCount />
				<PageMargins />
				<VolumeNavigation />
			</Card>

			<Card>
				<ImageFilter />
			</Card>

			<TypographySettings />
		</View>
	)
}
