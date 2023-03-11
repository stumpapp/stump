export { type DropdownMenuProps, DropdownMenu } from './DropdownMenu'
export {
	DropdownPrimitive,
	DropdownPrimitiveCheckboxItem,
	DropdownPrimitiveContent,
	DropdownPrimitiveGroup,
	DropdownPrimitiveItem,
	DropdownPrimitiveLabel,
	DropdownPrimitivePortal,
	DropdownPrimitiveRadioGroup,
	DropdownPrimitiveRadioItem,
	DropdownPrimitiveSeparator,
	DropdownPrimitiveShortcut,
	DropdownPrimitiveSub,
	DropdownPrimitiveSubContent,
	DropdownPrimitiveSubTrigger,
	DropdownPrimitiveTrigger,
} from './primitives'

export type GenericMenuItem = {
	label: string
	subItems?: GenericMenuItem[]
}

export type GenericMenuItemGroup<I extends GenericMenuItem> = {
	title?: string
	items: I[]
}

export type GenericMenu<I extends GenericMenuItem, G = GenericMenuItemGroup<I>> = {
	groups: G[]
}
