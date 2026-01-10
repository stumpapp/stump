import { ButtonProps } from '@expo/ui/swift-ui'
import { LucideIcon } from 'lucide-react-native'
import { ComponentPropsWithRef } from 'react'

import { DropdownMenuContent } from '../dropdown-menu'

export type AndroidProps = Pick<
	ComponentPropsWithRef<typeof DropdownMenuContent>,
	'sideOffset' | 'align' | 'className' | 'insets'
>

export type ActionMenuItem = {
	label: string
	icon: {
		ios: Pick<ButtonProps, 'systemImage'>['systemImage']
		android: LucideIcon
	}
	onPress: () => void
	role?: 'default' | 'destructive' | 'cancel'
	disabled?: boolean
}

export type ActionMenuProps = {
	icon?: {
		ios: Pick<ButtonProps, 'systemImage'>['systemImage']
		android: LucideIcon
	}
	groups: {
		items: ActionMenuItem[]
	}[]
	androidProps?: AndroidProps
	disabled?: boolean
}
