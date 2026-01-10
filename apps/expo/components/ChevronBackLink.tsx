import { useRouter } from 'expo-router'
import { ChevronLeft, LucideIcon } from 'lucide-react-native'
import { Pressable, TextStyle } from 'react-native'

import { IS_IOS_24_PLUS } from '~/lib/constants'
import { cn } from '~/lib/utils'

import { Icon } from './ui/icon'

type Props = {
	icon?: LucideIcon
	iconClassName?: string
	style?: TextStyle
}

// TODO: Change name now that I you can override the icon
export default function ChevronBackLink({ icon = ChevronLeft, iconClassName, style }: Props) {
	const router = useRouter()

	return (
		<Pressable
			onPress={() => router.back()}
			style={
				IS_IOS_24_PLUS
					? {
							width: 35,
							height: 35,
							justifyContent: 'center',
							alignItems: 'center',
						}
					: undefined
			}
		>
			<Icon
				as={icon}
				className={cn('h-6 w-6 text-foreground', iconClassName)}
				size={24}
				// @ts-expect-error: text styles definitely works
				style={style}
			/>
		</Pressable>
	)
}
