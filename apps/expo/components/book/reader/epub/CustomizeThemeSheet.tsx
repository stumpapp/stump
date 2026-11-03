import { TrueSheet } from '@lodev09/react-native-true-sheet'
import { useRef, useState } from 'react'
import { type ScrollViewInstance } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useShallow } from 'zustand/react/shallow'

import { SheetBackDetection } from '~/components/SheetBackDetection'
import { useColors } from '~/lib/constants'
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

	const innerScrollRef = useRef<ScrollViewInstance>(null)
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
				scrollableRef={innerScrollRef}
				backgroundColor={colors.sheet.background}
				grabberOptions={{ color: colors.sheet.grabber }}
				style={{
					flex: 1,
					paddingBottom: insets.bottom,
				}}
				insetAdjustment="automatic"
				onDidPresent={() => setIsOpen(true)}
				onDidDismiss={() => setIsOpen(false)}
			>
				<CustomizeTheme
					onCancel={handleClose}
					mode={mode}
					theme={name}
					scrollRef={innerScrollRef}
				/>
			</TrueSheet>

			<SheetBackDetection ref={sheetRef} isOpen={isOpen} />
		</>
	)
}
