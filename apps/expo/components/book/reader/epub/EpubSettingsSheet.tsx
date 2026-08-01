import { TrueSheet, TrueSheetProps } from '@lodev09/react-native-true-sheet'
import { PortalHost } from '@rn-primitives/portal'
import { useContext, useState } from 'react'
import { Platform, ScrollView } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { SheetBackDetection } from '~/components/SheetBackDetection'
import { IS_IOS_26_PLUS, useColors } from '~/lib/constants'
import { PortalHostContext } from '~/lib/PortalHostContext'
import { useEpubSheetStore } from '~/stores/epubSheet'

import { EpubReaderContext } from './context'
import ThemeSheetContent from './ThemeSheetContent'

const SHEET_PORTAL_HOST = 'epub-settings-sheet'

export default function EpubSettingsSheet(props: TrueSheetProps) {
	const sheetRef = useEpubSheetStore((state) => state.settingsSheetRef)

	const context = useContext(EpubReaderContext)

	const colors = useColors()
	const insets = useSafeAreaInsets()
	const [isOpen, setIsOpen] = useState(false)

	return (
		<>
			<TrueSheet
				name="epubSettings"
				ref={sheetRef}
				detents={[0.65]}
				dimmed={false}
				grabber
				scrollable
				backgroundColor={IS_IOS_26_PLUS ? undefined : colors.sheet.background}
				grabberOptions={{ color: colors.sheet.grabber }}
				style={{
					paddingBottom: insets.bottom,
				}}
				insetAdjustment="automatic"
				{...props}
				onDidPresent={() => setIsOpen(true)}
				onDidDismiss={() => {
					setIsOpen(false)
					if (context) {
						context.timer.resume()
					}
				}}
			>
				<PortalHostContext.Provider
					value={Platform.OS === 'android' ? SHEET_PORTAL_HOST : undefined}
				>
					<ScrollView className="p-6 flex-1" nestedScrollEnabled>
						<ThemeSheetContent />
					</ScrollView>
					{Platform.OS === 'android' && <PortalHost name={SHEET_PORTAL_HOST} />}
				</PortalHostContext.Provider>
			</TrueSheet>

			<SheetBackDetection ref={sheetRef} isOpen={isOpen} />
		</>
	)
}
