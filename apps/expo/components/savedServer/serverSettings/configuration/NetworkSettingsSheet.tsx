import { TrueSheet } from '@lodev09/react-native-true-sheet'
import { useRef, useState } from 'react'
import { ScrollView } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { SheetBackDetection } from '~/components/SheetBackDetection'
import { IS_IOS_26_PLUS, useColors } from '~/lib/constants'

import { NetworkSettingsSheetContent } from './NetworkSettingsSheetContent'

// there is a LOT of overlap between this and the advanced network settings sheet, and it is intentional.
// frankly, i think the complexity of juggling inline-state vs form-state vs incremental saves etc etc
// between the modalities is just not worth it, or at the very least the duplication will be easier to
// maintain than figuring that shit out. so here we are

export function NetworkSettingsSheet() {
	const colors = useColors()
	const insets = useSafeAreaInsets()
	const sheetRef = useRef<TrueSheet>(null)

	const [isOpen, setIsOpen] = useState(false)

	return (
		<TrueSheet
			name="serverNetworkSettingsSheet"
			ref={sheetRef}
			detents={[1]}
			grabber
			scrollable
			backgroundColor={IS_IOS_26_PLUS ? undefined : colors.sheet.background}
			grabberOptions={{ color: colors.sheet.grabber }}
			style={{
				paddingBottom: insets.bottom,
			}}
			insetAdjustment="automatic"
			onDidPresent={() => setIsOpen(true)}
			onDidDismiss={() => setIsOpen(false)}
		>
			<ScrollView className="p-6 flex-1" nestedScrollEnabled>
				<NetworkSettingsSheetContent />
			</ScrollView>

			<SheetBackDetection ref={sheetRef} isOpen={isOpen} />
		</TrueSheet>
	)
}
