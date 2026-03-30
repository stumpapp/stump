import { useRouter } from 'expo-router'
import { ChevronLeft, LucideIcon, LucideProps } from 'lucide-react-native'
import { StyleProp, ViewStyle } from 'react-native'
import { Pressable } from 'react-native-gesture-handler'

import { cn } from '~/lib/utils'

import { Icon } from './ui/icon'

type Props = LucideProps & {
	icon?: LucideIcon
	iconClassName?: string
	activeOpacity?: number
	style?: StyleProp<ViewStyle>
}

// TODO: Change name now that I you can override the icon
export default function ChevronBackLink({
	icon = ChevronLeft,
	activeOpacity,
	iconClassName,
	style,
	...props
}: Props) {
	const router = useRouter()
	return (
		<Pressable onPress={() => router.back()}>
			{({ pressed }) => (
				<Icon
					as={icon}
					className={cn('h-6 w-6 text-foreground', iconClassName)}
					size={24}
					style={[style, pressed && activeOpacity != undefined && { opacity: activeOpacity }]}
					{...props}
				/>
			)}
		</Pressable>
	)
}
