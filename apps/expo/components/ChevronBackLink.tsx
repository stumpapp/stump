import { useRouter } from 'expo-router'
import { ChevronLeft } from 'lucide-react-native'
import { Pressable, TextStyle } from 'react-native'

import { IS_IOS_24_PLUS } from '~/lib/constants'
import { cn } from '~/lib/utils'

import { Icon } from './ui/icon'

type Props = {
	iconClassName?: string
	style?: TextStyle
}

export default function ChevronBackLink({ iconClassName, style }: Props) {
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
				as={ChevronLeft}
				className={cn('h-6 w-6 text-foreground', iconClassName)}
				size={24}
				// @ts-expect-error: text styles definitely works
				style={style}
			/>
		</Pressable>
	)
}
