import type { BottomSheetModal as BSModalType } from '@gorhom/bottom-sheet'
import BottomSheet, {
	BottomSheetHandle as BSHandle,
	BottomSheetModal as BSModal,
	BottomSheetModalProvider,
	BottomSheetScrollView as BSScrollView,
	BottomSheetView as BSView,
} from '@gorhom/bottom-sheet'
import { cssInterop } from 'nativewind'
import React, { forwardRef, Fragment } from 'react'

import { BottomSheetProps, BSHandleProps } from './types'

const BottomSheetTrigger = Fragment

type BottomSheetModal = BSModalType

const BottomSheetModal = forwardRef<
	BSModal,
	BottomSheetProps & { children: React.ReactNode; isOpen?: boolean }
>(({ children, ...rest }: BottomSheetProps, ref) => {
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
	contentContainerclassName: 'contentContainerStyle',
})

const BottomSheetHandle: React.FC<BSHandleProps> = BSHandle

type TypedBottomSheet = typeof BottomSheet & {
	Provider: typeof BottomSheetModalProvider
	Modal: typeof BottomSheetModal
	Handle: typeof BottomSheetHandle
	ScrollView: typeof BottomSheetScrollView
	View: typeof BottomSheetView
	Trigger: typeof BottomSheetTrigger
}

const TypedBottomSheet = BottomSheet as TypedBottomSheet
TypedBottomSheet.Provider = BottomSheetModalProvider
TypedBottomSheet.Modal = BottomSheetModal
TypedBottomSheet.Handle = BottomSheetHandle
TypedBottomSheet.ScrollView = BottomSheetScrollView
TypedBottomSheet.View = BottomSheetView
TypedBottomSheet.Trigger = BottomSheetTrigger

export { TypedBottomSheet as BottomSheet }
