import { StackToolbarMenuActionProps } from 'expo-router'
import type { LucideIcon } from 'lucide-react-native'

export type PlatformIcon = {
	ios?: StackToolbarMenuActionProps['icon']
	android?: LucideIcon
}

export type MenuItemDef = {
	key: string
	icon?: PlatformIcon
	labelKey: string
	isOn: boolean
	disabled?: boolean
	subtitle?: string
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
