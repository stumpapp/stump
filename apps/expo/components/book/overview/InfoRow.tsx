import { View } from 'react-native'

import { Text } from '~/components/ui'
import { cn } from '~/lib/utils'

type Props = {
	label: string
	value: string
	longValue?: boolean
	numberOfLines?: number
}

export default function InfoRow({ label, value, longValue, numberOfLines }: Props) {
	return (
		<View className="flex flex-row items-start justify-between py-1">
			<Text className="shrink-0 text-foreground-subtle">{label}</Text>
			<Text
				className={cn('max-w-[75%] text-right', {
					'max-w-[80%]': longValue,
				})}
				numberOfLines={numberOfLines ?? longValue ? 4 : undefined}
			>
				{value}
			</Text>
		</View>
	)
}
