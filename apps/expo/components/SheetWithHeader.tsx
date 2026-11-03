import { TrueSheet, TrueSheetProps } from '@lodev09/react-native-true-sheet'
import { Check, X } from 'lucide-react-native'
import { RefObject, useRef, useState } from 'react'
import { Platform, ScrollView, type ScrollViewInstance, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { compositeColorOverBase, IS_IOS_26_PLUS, useColors } from '~/lib/constants'
import { cn } from '~/lib/utils'
import { PortalHostProvider } from '~/providers/PortalHostProvider'
import { usePreferencesStore } from '~/stores'

import { getScreenTintColor, ScreenBackgroundGradient } from './BackgroundGradient'
import { ThumbnailPlaceholderData } from './image'
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

type Props = TrueSheetProps & { ref?: RefObject<TrueSheet | null> } & HeaderProps & {
		backgroundColorData?: ThumbnailPlaceholderData | null
	}

export default function SheetWithHeader({
	children,
	ref,
	headerLabel,
	headerLeftButton,
	headerRightButton,
	onDidPresent,
	onDidDismiss,
	backgroundColorData,
	...props
}: Props) {
	const colors = useColors()
	const insets = useSafeAreaInsets()
	const listColors = usePreferencesStore((store) => store.tintListBackground)

	const sheetTintColor =
		backgroundColorData && listColors ? getScreenTintColor(backgroundColorData) : undefined

	const [isOpen, setIsOpen] = useState(false)
	const internalRef = useRef<TrueSheet>(null)
	const sheetRef = ref ?? internalRef

	const blurGradientHeader =
		!!(headerLabel || headerLeftButton || headerRightButton) && IS_IOS_26_PLUS

	const innerScrollRef = useRef<ScrollViewInstance>(null)

	return (
		<TrueSheet
			ref={sheetRef}
			grabber
			scrollableRef={innerScrollRef}
			backgroundColor={IS_IOS_26_PLUS ? undefined : colors.sheet.background}
			grabberOptions={{ color: colors.sheet.grabber }}
			style={{
				flex: 1,
				paddingBottom: insets.bottom,
			}}
			insetAdjustment="automatic"
			header={
				// i fckn hate not having grid in nativewind >:(
				<View
					className="px-4 pt-4 flex-row items-center justify-between"
					// this is to avoid a seem between header/content
					style={
						Platform.OS === 'android' && sheetTintColor
							? {
									backgroundColor: compositeColorOverBase(
										`${sheetTintColor}99`,
										colors.sheet.background,
									),
								}
							: undefined
					}
				>
					{resolveHeaderButton(headerLeftButton, sheetRef)}
					<View className="inset-x-0 pt-4 absolute items-center">
						<Heading className="font-semibold leading-6">{headerLabel}</Heading>
					</View>
					{resolveHeaderButton(headerRightButton, sheetRef)}
				</View>
			}
			headerStyle={
				// for the blur gradient under the header
				blurGradientHeader ? { position: 'absolute', left: 0, right: 0, zIndex: 1 } : undefined
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
			{backgroundColorData && listColors && (
				<ScreenBackgroundGradient
					imageMetadata={backgroundColorData}
					tintAndroidHeader={false}
					baseColor={colors.sheet.background}
				/>
			)}

			<PortalHostProvider name={Platform.OS === 'android' ? props.name : undefined}>
				<ScrollView
					ref={innerScrollRef}
					className={cn(
						'p-6 h-full',
						// the header is position: 'absolute' so we must manually offset
						blurGradientHeader && 'pt-[5.25rem]',
					)}
				>
					{children}
				</ScrollView>
			</PortalHostProvider>

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
