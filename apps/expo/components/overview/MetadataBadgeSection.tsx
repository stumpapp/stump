import { useMemo } from 'react'
import { ScrollView, View } from 'react-native'

import { Badge, Text } from '~/components/ui'

// TODO: Can probably extend to have some kind of onBadgePress or sm

type Props = {
	label: string
	items: string[]
	singleRowThreshold?: number // if <= to this then will render in a single row
}

export default function MetadataBadgeSection({ label, items, singleRowThreshold = 4 }: Props) {
	const rows = useMemo(() => {
		if (items.length <= singleRowThreshold) {
			return [items]
		}

		const midpoint = Math.ceil(items.length / 2)
		return [items.slice(0, midpoint), items.slice(midpoint)]
	}, [items, singleRowThreshold])

	if (items.length === 0) {
		return null
	}

	return (
		<View className="gap-2">
			<Text className="text-lg font-semibold text-foreground-muted">{label}</Text>

			<ScrollView horizontal showsHorizontalScrollIndicator={false}>
				<View className="gap-2">
					{rows.map((row, rowIndex) => (
						<View key={rowIndex} className="flex-row gap-2">
							{row.map((item) => (
								<Badge key={item}>
									<Text className="text-sm">{item}</Text>
								</Badge>
							))}
						</View>
					))}
				</View>
			</ScrollView>
		</View>
	)
}
