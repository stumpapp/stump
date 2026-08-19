import { TrueSheet, TrueSheetProps } from '@lodev09/react-native-true-sheet'
import { useRef, useState } from 'react'
import { ScrollView } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { SheetBackDetection } from '~/components/SheetBackDetection'
import { IS_IOS_26_PLUS, useColors } from '~/lib/constants'
import { ServerSettingsProvider } from '~/providers/ServerSettingsProvider'
import { SavedServer } from '~/stores/savedServer'

import { ServerSettingsSheetContent } from './ServerSettingsSheetContent'

type Props = {
	activeServer?: SavedServer
} & TrueSheetProps

export function ServerSettingsSheet({ activeServer, ...sheetProps }: Props) {
	const colors = useColors()
	const insets = useSafeAreaInsets()
	const sheetRef = useRef<TrueSheet>(null)

	const [isOpen, setIsOpen] = useState(false)

	return (
		<ServerSettingsProvider activeServer={activeServer}>
			<TrueSheet
				name="serverSettingsSheet"
				ref={sheetRef}
				detents={[1]}
				dimmed={false}
				grabber
				scrollable
				backgroundColor={IS_IOS_26_PLUS ? undefined : colors.sheet.background}
				grabberOptions={{ color: colors.sheet.grabber }}
				style={{
					paddingBottom: insets.bottom,
				}}
				insetAdjustment="automatic"
				{...sheetProps}
				onDidPresent={() => setIsOpen(true)}
				onDidDismiss={(event) => {
					setIsOpen(false)
					// TrueSheet.dismiss("serverNetworkSettingsSheet")
					sheetProps?.onDidDismiss?.(event)
				}}
			>
				<ScrollView className="p-6 flex-1" nestedScrollEnabled>
					<ServerSettingsSheetContent />
				</ScrollView>
			</TrueSheet>

			<SheetBackDetection ref={sheetRef} isOpen={isOpen} />
		</ServerSettingsProvider>
	)
}
