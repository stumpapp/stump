import { View } from 'react-native'

import { Card } from '~/components/ui'

import {
	Brightness,
	ColumnCount,
	CompactReaderLayout,
	FontConfig,
	ImageFilter,
	PageMargins,
	ReadingProgression,
	ThemeSelect,
	TypographySettings,
	VolumeNavigation,
} from './controls'

type ThemeSheetContentProps = {
	isSheetOpen: boolean
	setTouchingSlider: React.Dispatch<React.SetStateAction<boolean>>
}

// TODO: consider moving PreferMinimalReader prefs here too

export default function ThemeSheetContent({
	isSheetOpen,
	setTouchingSlider,
}: ThemeSheetContentProps) {
	return (
		<View className="gap-8 py-3 android:pb-12 flex-1">
			<Brightness setTouchingSlider={setTouchingSlider} isSheetOpen={isSheetOpen} />

			<ThemeSelect />

			<FontConfig />

			<Card>
				<ReadingProgression />
				<ColumnCount />
				<PageMargins />
				<CompactReaderLayout />
				<VolumeNavigation />
			</Card>

			<Card>
				<ImageFilter />
			</Card>

			<TypographySettings />
		</View>
	)
}
