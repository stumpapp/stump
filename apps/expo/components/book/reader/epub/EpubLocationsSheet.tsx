import { TrueSheet } from '@lodev09/react-native-true-sheet'
import { PortalHost } from '@rn-primitives/portal'
import { useState } from 'react'
import { Platform } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { SheetBackDetection } from '~/components/SheetBackDetection'
import { IS_IOS_26_PLUS, useColors } from '~/lib/constants'
import { PortalHostContext } from '~/lib/PortalHostContext'
import { useEpubSheetStore } from '~/stores/epubSheet'

import LocationsSheetContent from './LocationsSheetContent'

const SHEET_PORTAL_HOST = 'locations-settings-sheet'

export default function EpubLocationsSheet() {
	const sheetRef = useEpubSheetStore((state) => state.locationsSheetRef)

	const colors = useColors()
	const insets = useSafeAreaInsets()

	const [isOpen, setIsOpen] = useState(false)

	return (
		<>
			<TrueSheet
				ref={sheetRef}
				detents={[1]}
				dimmed={false}
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
				onDidDismiss={() => setIsOpen(false)}
			>
				<PortalHostContext.Provider
					value={Platform.OS === 'android' ? SHEET_PORTAL_HOST : undefined}
				>
					<LocationsSheetContent />
					{Platform.OS === 'android' && <PortalHost name={SHEET_PORTAL_HOST} />}
				</PortalHostContext.Provider>
			</TrueSheet>

			<SheetBackDetection ref={sheetRef} isOpen={isOpen} />
		</>
	)
}
