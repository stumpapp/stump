import { View } from 'react-native'

import { Text } from '~/components/ui'
import { cn } from '~/lib/utils'

type Props = {
	label: string
	rows: React.ReactNode[]
}

export default function InfoSection({ label, rows }: Props) {
	return (
		<View className="flex w-full gap-2">
			<Text className="text-lg text-foreground-muted">{label}</Text>
			<View className="squircle flex flex-col rounded-lg border border-edge bg-background-surface">
				{rows.map((row, index) => (
					<View key={`section-${label}-${index}`}>
						{row}
						{index < rows.length - 1 && <Divider />}
					</View>
				))}
			</View>
		</View>
	)
}

// TODO: Not full width on iOS like native list?
const Divider = () => <View className={cn('h-px w-full bg-edge')} />
