import { ButtonProps } from '@expo/ui/swift-ui'
import { LucideIcon } from 'lucide-react-native'

export type ContextMenuItem = {
	label: string
	subtext?: string
	icon: {
		ios: Pick<ButtonProps, 'systemImage'>['systemImage']
		android:
			| LucideIcon
			| {
					icon: LucideIcon
					fill?: string
					stroke?: string
			  }
	}
	onPress: () => void
	role?: 'default' | 'destructive'
	disabled?: boolean
}

export type ContextMenuGroup = {
	items: ContextMenuItem[]
}

export type ContextMenuChildrenCallback = (state: { pressed: boolean }) => React.ReactNode

export type ContextMenuProps = {
	children: React.ReactNode | ContextMenuChildrenCallback
	groups: ContextMenuGroup[]
	disabled?: boolean
	onPress?: () => void
}
