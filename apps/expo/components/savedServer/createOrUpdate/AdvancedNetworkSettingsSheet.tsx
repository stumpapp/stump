import { TrueSheet } from '@lodev09/react-native-true-sheet'
import { Check } from 'lucide-react-native'
import { useRef, useState } from 'react'
import { ScrollView, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { SheetBackDetection } from '~/components/SheetBackDetection'
import { Heading } from '~/components/ui'
import { HeaderButton } from '~/components/ui/header-button/header-button'
import { IS_IOS_26_PLUS, useColors } from '~/lib/constants'

import { AdvancedNetworkSettingsSheetContent } from './AdvancedNetworkSettingsSheetContent'

export function AdvancedNetworkSettingsSheet() {
	const colors = useColors()
	const insets = useSafeAreaInsets()
	const sheetRef = useRef<TrueSheet>(null)

	const [isOpen, setIsOpen] = useState(false)

	return (
		<TrueSheet
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
			onDidPresent={() => setIsOpen(true)}
			onDidDismiss={() => setIsOpen(false)}
			// i fkcn hate not having grid in nativewind >:(
			header={
				<View className="px-4 pt-4 relative flex-row items-center">
					<View className="inset-x-0 pt-4 absolute items-center">
						<Heading className="font-semibold leading-6">Network Settings</Heading>
					</View>

					<View className="flex-1" />

					<HeaderButton
						ios={{ variant: 'glassProminent' }}
						icon={{ ios: 'checkmark', android: Check }}
						onPress={() => sheetRef.current?.dismiss()}
					/>
				</View>
			}
		>
			<ScrollView className="p-6 flex-1" nestedScrollEnabled>
				<AdvancedNetworkSettingsSheetContent />
			</ScrollView>

			<SheetBackDetection ref={sheetRef} isOpen={isOpen} />
		</TrueSheet>
	)
}
