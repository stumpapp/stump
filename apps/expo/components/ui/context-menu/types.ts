import { ButtonProps } from '@expo/ui/swift-ui'
import { LucideIcon } from 'lucide-react-native'

export type ContextMenuItem = {
	label: string
	subtext?: string
	icon: {
		ios: Pick<ButtonProps, 'systemImage'>['systemImage']
		android: LucideIcon
	}
	onPress: () => void
	role?: 'default' | 'destructive'
	disabled?: boolean
}

export type ContextMenuProps = {
	children: React.ReactNode
	groups: {
		items: ContextMenuItem[]
	}[]
	disabled?: boolean
	onPress?: () => void
}
