import { TrueSheet } from '@lodev09/react-native-true-sheet'
import { useRef } from 'react'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import SheetWithHeader from '~/components/SheetWithHeader'
import { IS_IOS_26_PLUS, useColors } from '~/lib/constants'

import { AdvancedNetworkSettingsSheetContent } from './AdvancedNetworkSettingsSheetContent'

export function AdvancedNetworkSettingsSheet() {
	const colors = useColors()
	const insets = useSafeAreaInsets()
	const sheetRef = useRef<TrueSheet>(null)

	return (
		<SheetWithHeader
			name="advancedNetworkSettingsSheet"
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
			headerLabel="Network Settings"
			headerRightButton={{ type: 'check', onPress: () => sheetRef.current?.dismiss() }}
		>
			<AdvancedNetworkSettingsSheetContent />
		</SheetWithHeader>
	)
}
