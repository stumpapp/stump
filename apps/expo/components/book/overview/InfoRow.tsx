import { View } from 'react-native'
import { Text } from '~/components/ui'
import { cn } from '~/lib/utils'

type Props = {
	label: string
	value: string
	longValue?: boolean
}

export default function InfoRow({ label, value, longValue }: Props) {
	return (
		<View className="flex flex-row items-start justify-between py-1">
			<Text className="shrink-0 text-foreground-subtle">{label}</Text>
			<Text
				className={cn('max-w-[75%] text-right', {
					'max-w-[80%]': longValue,
				})}
			>
				{value}
			</Text>
		</View>
	)
}
