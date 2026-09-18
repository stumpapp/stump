import type { LucideIcon } from 'lucide-react-native'
import type { ImageSourcePropType } from 'react-native'
import type { SFSymbol } from 'sf-symbols-typescript'

export type PlatformIcon = {
	ios?: SFSymbol | ImageSourcePropType | { xcasset: string }
	android?: LucideIcon
}

export type MenuItemDef = {
	key: string
	icon?: PlatformIcon
	label: string
	isOn: boolean
	disabled?: boolean
	subtitle?: string
	isAction?: boolean
	destructive?: boolean
	onPress: () => void
}

export type MenuGroupDef = {
	key: string
	title?: string
	label?: string
	inline?: boolean // does nothing on the droid
	items: MenuItemDef[]
}

export type SortFieldDef = {
	field: string
	/**
	 * the key in the order object
	 */
	orderKey: string
}

export type ActionDef = {
	key: string
	label: string
	icon?: PlatformIcon
	destructive?: boolean
	onPress: () => void
}

export type FilterOptionDef = {
	key: string
	value: string
	icon?: PlatformIcon
	label: string
}

type BaseFilterGroupDef = {
	key: string
	title?: string
	inline?: boolean
	items: FilterOptionDef[]
}

export type FilterGroupDef = BaseFilterGroupDef & {
	mode: 'single' | 'multi'
	filterPath: string
	unsetPath?: string
}
