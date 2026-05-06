import { TrueSheet } from '@lodev09/react-native-true-sheet'
import { useState } from 'react'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useShallow } from 'zustand/react/shallow'

import { SheetBackDetection } from '~/components/SheetBackDetection'
import { IS_IOS_26_PLUS, useColors } from '~/lib/constants'
import { useEpubSheetStore } from '~/stores/epubSheet'

import { CustomizeTheme } from './controls/customTheme'

export default function CustomizeThemeSheet() {
	const sheetRef = useEpubSheetStore((state) => state.customizeThemeSheetRef)
	const { mode, name } = useEpubSheetStore(
		useShallow((state) => ({
			mode: state.customizeThemeMode,
			name: state.customizeThemeName,
		})),
	)
	const closeSheet = useEpubSheetStore((state) => state.closeSheet)

	const colors = useColors()
	const insets = useSafeAreaInsets()

	const [isOpen, setIsOpen] = useState(false)

	const handleClose = () => {
		closeSheet('customizeTheme')
	}

	return (
		<>
			<TrueSheet
				ref={sheetRef}
				detents={[1]}
				grabber
				scrollable
				backgroundColor={IS_IOS_26_PLUS ? undefined : colors.background.DEFAULT}
				grabberOptions={{ color: colors.sheet.grabber }}
				style={{
					paddingBottom: insets.bottom,
				}}
				insetAdjustment="automatic"
				onDidPresent={() => setIsOpen(true)}
				onDidDismiss={() => setIsOpen(false)}
			>
				<CustomizeTheme onCancel={handleClose} mode={mode} theme={name} />
			</TrueSheet>

			<SheetBackDetection ref={sheetRef} isOpen={isOpen} />
		</>
	)
}
