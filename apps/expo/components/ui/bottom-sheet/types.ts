//#region Gorhom Bottom Sheet

import { BottomSheetHandleProps, BottomSheetModalProps as BSModalProps } from '@gorhom/bottom-sheet'

export interface BSHandleProps extends BottomSheetHandleProps {
	className?: string
}
//#endregion

//#region Vaul

type WithFadeFromProps = object
type WithoutFadeFromProps = object

interface DialogProps extends WithFadeFromProps, WithoutFadeFromProps {
	activeSnapPoint?: number | string | null
	setActiveSnapPoint?: (snapPoint: number | string | null) => void
	children?: React.ReactNode
	open?: boolean
	closeThreshold?: number
	noBodyStyles?: boolean
	onOpenChange?: (open: boolean) => void
	shouldScaleBackground?: boolean
	setBackgroundColorOnScale?: boolean
	scrollLockTimeout?: number
	fixed?: boolean
	dismissible?: boolean
	handleOnly?: boolean
	onDrag?: (event: React.PointerEvent<HTMLDivElement>, percentageDragged: number) => void
	onRelease?: (event: React.PointerEvent<HTMLDivElement>, open: boolean) => void
	modal?: boolean
	nested?: boolean
	onClose?: () => void
	// vaul property for Drawer direction
	direction?: 'top' | 'bottom' | 'left' | 'right'
	preventScrollRestoration?: boolean
	disablePreventScroll?: boolean
}
//#endregion

//#region Shared types
export interface BottomSheetModalProps extends DialogProps, BSModalProps {
	children: React.ReactNode
	isOpen?: boolean
	snapPoints?: Pick<BSModalProps, 'snapPoints'>['snapPoints']
}
//#endregion
