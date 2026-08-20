import { TrueSheet, TrueSheetProps } from '@lodev09/react-native-true-sheet'
import { Check, X } from 'lucide-react-native'
import { RefObject, useRef, useState } from 'react'
import { ScrollView, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { IS_IOS_26_PLUS, useColors } from '~/lib/constants'
import { cn } from '~/lib/utils'

import { SheetBackDetection } from './SheetBackDetection'
import { Heading } from './ui'
import { HeaderButton } from './ui/header-button/header-button'

type HeaderButtonPreset =
	| { type: 'dismiss' }
	| { type: 'check'; onPress: () => void; disabled?: boolean }

type HeaderProps = {
	headerLabel?: string
	headerLeftButton?: HeaderButtonPreset
	headerRightButton?: HeaderButtonPreset
}

type Props = TrueSheetProps & { ref?: RefObject<TrueSheet | null> } & HeaderProps

// TODO: replace CreateAnnotationSheet and AnnotationSheetHeader with this stuff

export default function ScrollViewSheet({
	children,
	ref,
	headerLabel,
	headerLeftButton,
	headerRightButton,
	onDidPresent,
	onDidDismiss,
	...props
}: Props) {
	const colors = useColors()
	const insets = useSafeAreaInsets()

	const [isOpen, setIsOpen] = useState(false)
	const internalRef = useRef<TrueSheet>(null)
	const sheetRef = ref ?? internalRef

	return (
		<TrueSheet
			ref={sheetRef}
			grabber
			scrollable
			backgroundColor={IS_IOS_26_PLUS ? undefined : colors.sheet.background}
			grabberOptions={{ color: colors.sheet.grabber }}
			style={{ paddingBottom: insets.bottom }}
			insetAdjustment="automatic"
			header={
				// i fkcn hate not having grid in nativewind >:(
				<View className="px-4 pt-4 flex-row items-center justify-between">
					{resolveHeaderButton(headerLeftButton, sheetRef)}
					<View className="inset-x-0 pt-4 absolute items-center">
						<Heading className="font-semibold leading-6">{headerLabel}</Heading>
					</View>
					{resolveHeaderButton(headerRightButton, sheetRef)}
				</View>
			}
			headerStyle={
				// for the blur gradient under the header
				IS_IOS_26_PLUS ? { position: 'absolute', left: 0, right: 0, zIndex: 1 } : undefined
			}
			scrollableOptions={{ topScrollEdgeEffect: 'soft' }}
			onDidPresent={(e) => {
				setIsOpen(true)
				onDidPresent?.(e)
			}}
			onDidDismiss={(e) => {
				setIsOpen(false)
				onDidDismiss?.(e)
			}}
			{...props}
		>
			<ScrollView
				className={cn(
					'p-6',
					// the header is position: 'absolute' so we must manually offset
					IS_IOS_26_PLUS && 'pt-20',
				)}
				nestedScrollEnabled
			>
				{children}
			</ScrollView>

			<SheetBackDetection ref={sheetRef} isOpen={isOpen} />
		</TrueSheet>
	)
}

function resolveHeaderButton(
	preset: HeaderButtonPreset | undefined,
	sheetRef: RefObject<TrueSheet | null>,
) {
	if (!preset) {
		return <View />
	}

	if (preset.type === 'dismiss') {
		return (
			<HeaderButton
				ios={{ variant: 'glass' }}
				icon={{ ios: 'xmark', android: X }}
				onPress={() => sheetRef.current?.dismiss()}
			/>
		)
	}

	if (preset.type === 'check') {
		return (
			<HeaderButton
				ios={{ variant: 'glassProminent' }}
				android={{ variant: 'prominent' }}
				icon={{ ios: 'checkmark', android: Check }}
				onPress={preset.onPress}
				disabled={preset.disabled}
			/>
		)
	}
}
