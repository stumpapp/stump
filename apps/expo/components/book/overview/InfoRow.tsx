import { View } from 'react-native'

import { Text } from '~/components/ui'
import { cn } from '~/lib/utils'

type Props = {
	label: string
	value: string
	longValue?: boolean
	numberOfLines?: number
	className?: string
}

export default function InfoRow({ label, value, longValue, numberOfLines, className }: Props) {
	return (
		<View className={cn('flex flex-row items-start justify-between gap-x-4 px-4 py-3', className)}>
			<Text className="shrink-0 text-foreground-muted">{label}</Text>
			<Text
				className="flex-1 text-right"
				numberOfLines={(numberOfLines ?? longValue) ? 4 : undefined}
			>
				{value}
			</Text>
		</View>
	)
}
