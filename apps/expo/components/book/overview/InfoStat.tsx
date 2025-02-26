import { View } from 'react-native'

import { Heading, Text } from '~/components/ui'

export default function InfoStat({ label, value }: { label: string; value: string }) {
	return (
		<View className="flex items-center justify-center">
			<Heading className="font-medium">{value}</Heading>
			<Text size="sm" className="shrink-0 text-foreground-muted">
				{label}
			</Text>
		</View>
	)
}
