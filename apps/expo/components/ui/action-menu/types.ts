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
}

export type ActionMenuProps = {
	groups: {
		items: ActionMenuItem[]
	}[]
	androidProps?: AndroidProps
}
