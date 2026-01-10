import { TrueSheet } from '@lodev09/react-native-true-sheet'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { IS_IOS_24_PLUS, useColors } from '~/lib/constants'
import { useColorScheme } from '~/lib/useColorScheme'
import { useEpubSheetStore } from '~/stores/epubSheet'

import { CustomizeTheme } from './controls/customTheme'

export default function CustomizeThemeSheet() {
	const sheetRef = useEpubSheetStore((state) => state.customizeThemeSheetRef)
	const { mode, name } = useEpubSheetStore((state) => ({
		mode: state.customizeThemeMode,
		name: state.customizeThemeName,
	}))
	const closeSheet = useEpubSheetStore((state) => state.closeSheet)

	const { colorScheme } = useColorScheme()
	const colors = useColors()
	const insets = useSafeAreaInsets()

	const handleClose = () => {
		closeSheet('customizeTheme')
	}

	return (
		<TrueSheet
			ref={sheetRef}
			detents={[1]}
			cornerRadius={24}
			grabber
			scrollable
			backgroundColor={IS_IOS_24_PLUS ? undefined : colors.background.DEFAULT}
			grabberOptions={{
				color: colorScheme === 'dark' ? '#333' : '#ccc',
			}}
			style={{
				paddingBottom: insets.bottom,
			}}
			insetAdjustment="automatic"
		>
			<CustomizeTheme onCancel={handleClose} mode={mode} theme={name} />
		</TrueSheet>
	)
}
