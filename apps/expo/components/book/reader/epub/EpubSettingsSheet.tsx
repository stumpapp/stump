import { TrueSheet } from '@lodev09/react-native-true-sheet'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { useColors } from '~/lib/constants'
import { useColorScheme } from '~/lib/useColorScheme'
import { useEpubSheetStore } from '~/stores/epubSheet'

import ThemeSheetContent from './ThemeSheetContent'

export default function EpubSettingsSheet() {
	const sheetRef = useEpubSheetStore((state) => state.settingsSheetRef)

	const { colorScheme } = useColorScheme()
	const colors = useColors()
	const insets = useSafeAreaInsets()

	return (
		<TrueSheet
			ref={sheetRef}
			detents={[1]}
			cornerRadius={24}
			grabber
			backgroundColor={colors.background.DEFAULT}
			grabberOptions={{
				color: colorScheme === 'dark' ? '#333' : '#ccc',
			}}
			style={{
				paddingBottom: insets.bottom,
			}}
		>
			<ThemeSheetContent />
		</TrueSheet>
	)
}
