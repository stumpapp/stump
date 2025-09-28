import type { BottomSheetModal as BSModalType } from '@gorhom/bottom-sheet'
import BottomSheet, {
	BottomSheetHandle as BSHandle,
	BottomSheetModal as BSModal,
	BottomSheetModalProvider,
	BottomSheetScrollView as BSScrollView,
	type BottomSheetScrollViewMethods,
	BottomSheetTextInput as BSTextInput,
	BottomSheetView as BSView,
	createBottomSheetScrollableComponent,
	SCROLLABLE_TYPE,
} from '@gorhom/bottom-sheet'
import { BottomSheetScrollViewProps } from '@gorhom/bottom-sheet/lib/typescript/components/bottomSheetScrollable/types'
import { BottomSheetTextInputProps } from '@gorhom/bottom-sheet/lib/typescript/components/bottomSheetTextInput'
import { cssInterop } from 'nativewind'
import React, { forwardRef, Fragment, memo } from 'react'
import { View } from 'react-native'
import {
	KeyboardAwareScrollView,
	KeyboardAwareScrollViewProps,
} from 'react-native-keyboard-controller'
import Reanimated from 'react-native-reanimated'

import { cn } from '~/lib/utils'

import { Text } from '../text'
import { BottomSheetModalProps, BSHandleProps } from './types'

const BottomSheetTrigger = Fragment

type BottomSheetModal = BSModalType

const BottomSheetModal = forwardRef<
	BSModal,
	BottomSheetModalProps & { children: React.ReactNode; isOpen?: boolean }
>(({ children, ...rest }: BottomSheetModalProps, ref) => {
	return (
		<BSModal ref={ref} {...rest}>
			{children}
		</BSModal>
	)
})
BottomSheetModal.displayName = 'BottomSheetModal'

const BottomSheetView = cssInterop(BSView, {
	className: 'style',
})

const BottomSheetScrollView = cssInterop(BSScrollView, {
	className: 'style',
	// contentContainerclassName: 'contentContainerStyle',
})

const AnimatedScrollView =
	Reanimated.createAnimatedComponent<KeyboardAwareScrollViewProps>(KeyboardAwareScrollView)
const BottomSheetScrollViewComponent = createBottomSheetScrollableComponent<
	BottomSheetScrollViewMethods,
	BottomSheetScrollViewProps
>(SCROLLABLE_TYPE.SCROLLVIEW, AnimatedScrollView)
const BottomSheetKeyboardAwareScrollView = memo(BottomSheetScrollViewComponent)

BottomSheetKeyboardAwareScrollView.displayName = 'BottomSheetKeyboardAwareScrollView'

const BottomSheetHandle: React.FC<BSHandleProps> = BSHandle

const BottomSheetTextInput = forwardRef<
	React.ComponentRef<typeof BSTextInput>,
	BottomSheetTextInputProps & { label?: string; errorMessage?: string }
>(({ label, errorMessage, ...rest }, ref) => {
	return (
		<View className="w-full gap-1.5">
			{label && <Text className="text-base font-medium text-foreground-muted">{label}</Text>}
			<BSTextInput
				ref={ref}
				{...rest}
				className={cn(
					'native:h-12 native:text-lg native:leading-[1.25] squircle h-10 rounded-lg border border-edge bg-background px-3 text-base text-foreground file:border-0 file:bg-transparent file:font-medium lg:text-sm',
					rest.editable === false && 'opacity-50',
					{ 'border-edge-danger': !!errorMessage },
					rest.className,
				)}
				placeholderClassName={cn(
					'text-foreground-muted',
					{ 'text-fill-danger': !!errorMessage },
					rest.placeholderClassName,
				)}
			/>
			{errorMessage && <Text className="text-sm text-fill-danger">{errorMessage}</Text>}
		</View>
	)
})
BottomSheetTextInput.displayName = 'BottomSheetTextInput'

type TypedBottomSheet = typeof BottomSheet & {
	Provider: typeof BottomSheetModalProvider
	Modal: typeof BottomSheetModal
	Handle: typeof BottomSheetHandle
	ScrollView: typeof BottomSheetScrollView
	KeyboardAwareScrollView: typeof BottomSheetKeyboardAwareScrollView
	View: typeof BottomSheetView
	Trigger: typeof BottomSheetTrigger
	Input: typeof BottomSheetTextInput
}

const TypedBottomSheet = BottomSheet as TypedBottomSheet
TypedBottomSheet.Provider = BottomSheetModalProvider
TypedBottomSheet.Modal = BottomSheetModal
TypedBottomSheet.Handle = BottomSheetHandle
TypedBottomSheet.ScrollView = BottomSheetScrollView
TypedBottomSheet.KeyboardAwareScrollView = BottomSheetKeyboardAwareScrollView
TypedBottomSheet.View = BottomSheetView
TypedBottomSheet.Trigger = BottomSheetTrigger
TypedBottomSheet.Input = BottomSheetTextInput

export { TypedBottomSheet as BottomSheet }
