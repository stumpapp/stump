import { useRouter } from 'expo-router'
import { ArrowLeft, ChevronLeft, LucideProps } from 'lucide-react-native'
import { Platform, StyleProp, ViewStyle } from 'react-native'
import { Pressable } from 'react-native-gesture-handler'

import { cn } from '~/lib/utils'

import { Icon } from './ui/icon'

type Props = LucideProps & {
	iconClassName?: string
	activeOpacity?: number
	style?: StyleProp<ViewStyle>
}

const DEFAULT_ACTIVE_OPACITY = Platform.select({
	android: 0.8,
	ios: undefined,
})

export default function BackLink({
	activeOpacity = DEFAULT_ACTIVE_OPACITY,
	iconClassName,
	style,
	...props
}: Props) {
	const router = useRouter()

	return (
		<Pressable onPress={() => router.back()}>
			{({ pressed }) => (
				<Icon
					// it seems material uses arrows not chevrons
					as={Platform.OS === 'android' ? ArrowLeft : ChevronLeft}
					className={cn(
						'h-6 w-6 text-foreground',
						// this is roughly-ish the amount of gap android seems to have
						{
							'mr-8': Platform.OS === 'android',
						},
						iconClassName,
					)}
					size={24}
					style={[style, pressed && activeOpacity != undefined && { opacity: activeOpacity }]}
					{...props}
				/>
			)}
		</Pressable>
	)
}
