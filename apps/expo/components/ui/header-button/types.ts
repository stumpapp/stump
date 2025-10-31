import {
	ButtonProps as IosButtonProps,
	ButtonRole,
	ButtonVariant as IosButtonVariant,
} from '@expo/ui/swift-ui'
import { LucideIcon } from 'lucide-react-native'
import { StyleProp, ViewStyle } from 'react-native'

export type HeaderButtonProps = {
	icon?: {
		ios?: Pick<IosButtonProps, 'systemImage'>['systemImage']
		android?: LucideIcon
		color?: string
		size?: number
	}
	ios?: {
		variant?: IosButtonVariant
	}
	role?: ButtonRole
	onPress?: () => void
	disabled?: boolean
	style?: StyleProp<ViewStyle>
}
