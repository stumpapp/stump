import { BottomSheetModal } from '@gorhom/bottom-sheet'
import { Fragment, useRef } from 'react'
import { Pressable } from 'react-native'
import { useSharedValue } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { BottomSheet, Text } from '~/components/ui'
import { useColors } from '~/lib/constants'
import { useColorScheme } from '~/lib/useColorScheme'

import InfoRow from '../InfoRow'
import { LongValueProps } from './types'

// TODO: Don't intake stripped HTML, strip for preview and render markdown in sheet
export default function LongValue({ label, value }: LongValueProps) {
	const ref = useRef<BottomSheetModal | null>(null)
	const animatedIndex = useSharedValue<number>(0)
	const animatedPosition = useSharedValue<number>(0)

	const insets = useSafeAreaInsets()
	const colors = useColors()
	const { colorScheme } = useColorScheme()

	return (
		<Fragment>
			<Pressable onPress={() => ref.current?.present()}>
				<InfoRow label={label} value={value} longValue />
			</Pressable>

			<BottomSheet.Modal
				ref={ref}
				topInset={insets.top}
				bottomInset={insets.bottom}
				backgroundStyle={{
					borderRadius: 24,
					borderCurve: 'continuous',
					overflow: 'hidden',
					borderWidth: 1,
					borderColor: colors.edge.DEFAULT,
					backgroundColor: colors.background.DEFAULT,
				}}
				keyboardBlurBehavior="restore"
				handleIndicatorStyle={{ backgroundColor: colorScheme === 'dark' ? '#333' : '#ccc' }}
				handleComponent={(props) => (
					<BottomSheet.Handle
						{...props}
						className="mt-2"
						animatedIndex={animatedIndex}
						animatedPosition={animatedPosition}
					/>
				)}
			>
				<BottomSheet.ScrollView className="flex-1 p-6">
					<Text className="text-foreground">{value}</Text>
				</BottomSheet.ScrollView>
			</BottomSheet.Modal>
		</Fragment>
	)
}
