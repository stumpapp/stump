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

type ThemeSheetContentProps = {
	setTouchingSlider: React.Dispatch<React.SetStateAction<boolean>>
}

export default function ThemeSheetContent({ setTouchingSlider }: ThemeSheetContentProps) {
	return (
		<View className="gap-8 py-3 android:pb-12 flex-1">
			<Brightness setTouchingSlider={setTouchingSlider} />

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
