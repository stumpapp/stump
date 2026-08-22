import { TrueSheet } from '@lodev09/react-native-true-sheet'
import { useRef } from 'react'

import SheetWithHeader from '~/components/SheetWithHeader'

import { AdvancedNetworkSettingsSheetContent } from './AdvancedNetworkSettingsSheetContent'

export function AdvancedNetworkSettingsSheet() {
	const sheetRef = useRef<TrueSheet>(null)

	return (
		<SheetWithHeader
			name="advancedNetworkSettingsSheet"
			ref={sheetRef}
			detents={[1]}
			scrollable
			headerLabel="Network Settings"
			headerRightButton={{ type: 'check', onPress: () => sheetRef.current?.dismiss() }}
		>
			<AdvancedNetworkSettingsSheetContent />
		</SheetWithHeader>
	)
}
