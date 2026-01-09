import { TrueSheet } from '@lodev09/react-native-true-sheet'
import { PortalHost } from '@rn-primitives/portal'
import { Platform, ScrollView } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { IS_IOS_24_PLUS, useColors } from '~/lib/constants'
import { PortalHostContext } from '~/lib/PortalHostContext'
import { useColorScheme } from '~/lib/useColorScheme'
import { useEpubSheetStore } from '~/stores/epubSheet'

import ThemeSheetContent from './ThemeSheetContent'

const SHEET_PORTAL_HOST = 'epub-settings-sheet'

export default function EpubSettingsSheet() {
	const sheetRef = useEpubSheetStore((state) => state.settingsSheetRef)

	const { colorScheme } = useColorScheme()
	const colors = useColors()
	const insets = useSafeAreaInsets()

	return (
		<TrueSheet
			ref={sheetRef}
			detents={[0.65]}
			dimmed={false}
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
			<PortalHostContext.Provider value={Platform.OS === 'android' ? SHEET_PORTAL_HOST : undefined}>
				<ScrollView className="flex-1 p-6" nestedScrollEnabled>
					<ThemeSheetContent />
				</ScrollView>
				{Platform.OS === 'android' && <PortalHost name={SHEET_PORTAL_HOST} />}
			</PortalHostContext.Provider>
		</TrueSheet>
	)
}
