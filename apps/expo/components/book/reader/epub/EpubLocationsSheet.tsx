import { TrueSheet } from '@lodev09/react-native-true-sheet'
import { PortalHost } from '@rn-primitives/portal'
import { Platform } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { IS_IOS_24_PLUS, useColors } from '~/lib/constants'
import { PortalHostContext } from '~/lib/PortalHostContext'
import { useColorScheme } from '~/lib/useColorScheme'
import { useEpubSheetStore } from '~/stores/epubSheet'

import LocationsSheetContent from './LocationsSheetContent'

const SHEET_PORTAL_HOST = 'locations-settings-sheet'

export default function EpubLocationsSheet() {
	const sheetRef = useEpubSheetStore((state) => state.locationsSheetRef)

	const { colorScheme } = useColorScheme()
	const colors = useColors()
	const insets = useSafeAreaInsets()

	return (
		<TrueSheet
			ref={sheetRef}
			detents={[1]}
			cornerRadius={24}
			dimmed={false}
			scrollable
			grabber
			backgroundColor={IS_IOS_24_PLUS ? undefined : colors.background.DEFAULT}
			grabberOptions={{
				color: colorScheme === 'dark' ? '#333' : '#ccc',
			}}
			style={{
				paddingBottom: insets.bottom,
				flex: 1,
			}}
			insetAdjustment="automatic"
		>
			<PortalHostContext.Provider value={Platform.OS === 'android' ? SHEET_PORTAL_HOST : undefined}>
				<LocationsSheetContent />
				{Platform.OS === 'android' && <PortalHost name={SHEET_PORTAL_HOST} />}
			</PortalHostContext.Provider>
		</TrueSheet>
	)
}
