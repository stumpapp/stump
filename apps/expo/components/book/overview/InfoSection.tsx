import { View } from 'react-native'

import { Card, CardDivider, Text } from '~/components/ui'

type Props = {
	label: string
	rows: React.ReactNode[]
}

export default function InfoSection({ label, rows }: Props) {
	return (
		<View className="flex w-full gap-2">
			<Text className="text-lg text-foreground-muted">{label}</Text>
			<Card>
				{rows.map((row, index) => (
					<View key={`section-${label}-${index}`}>
						{row}
						{index < rows.length - 1 && <CardDivider />}
					</View>
				))}
			</Card>
		</View>
	)
}
