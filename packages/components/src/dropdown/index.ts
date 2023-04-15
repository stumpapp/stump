export { DropdownMenu, type DropdownMenuProps } from './DropdownMenu'
export {
	Dropdown,
	DropdownCheckboxItem,
	DropdownContent,
	DropdownGroup,
	DropdownItem,
	DropdownLabel,
	DropdownPortal,
	DropdownRadioGroup,
	DropdownRadioItem,
	DropdownSeparator,
	DropdownShortcut,
	DropdownSub,
	DropdownSubContent,
	DropdownSubTrigger,
	DropdownTrigger,
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
