import { TrueSheet } from '@lodev09/react-native-true-sheet'
import { PortalHost } from '@rn-primitives/portal'
import { useState } from 'react'
import { Platform } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { SheetBackDetection } from '~/components/SheetBackDetection'
import { IS_IOS_26_PLUS, useColors } from '~/lib/constants'
import { PortalHostContext } from '~/lib/PortalHostContext'
import { useEpubSheetStore } from '~/stores/epubSheet'

import AnnotationsSheetContent from './AnnotationsSheetContent'
import { useEpubReaderContext } from './context'

const SHEET_PORTAL_HOST = 'annotations-sheet'

export default function AnnotationsSheet() {
	const sheetRef = useEpubSheetStore((state) => state.annotationsSheetRef)
	const { timer } = useEpubReaderContext()

	const colors = useColors()
	const insets = useSafeAreaInsets()

	const [isOpen, setIsOpen] = useState(false)

	return (
		<>
			<TrueSheet
				ref={sheetRef}
				detents={[1]}
				scrollable
				grabber
				backgroundColor={IS_IOS_26_PLUS ? undefined : colors.background.DEFAULT}
				grabberOptions={{ color: colors.sheet.grabber }}
				style={{
					paddingBottom: insets.bottom,
					flex: 1,
				}}
				insetAdjustment="automatic"
				onDidPresent={() => setIsOpen(true)}
				onDidDismiss={() => {
					setIsOpen(false)
					timer.resume()
				}}
			>
				<PortalHostContext.Provider
					value={Platform.OS === 'android' ? SHEET_PORTAL_HOST : undefined}
				>
					<AnnotationsSheetContent />
					{Platform.OS === 'android' && <PortalHost name={SHEET_PORTAL_HOST} />}
				</PortalHostContext.Provider>
			</TrueSheet>

			<SheetBackDetection ref={sheetRef} isOpen={isOpen} />
		</>
	)
}
