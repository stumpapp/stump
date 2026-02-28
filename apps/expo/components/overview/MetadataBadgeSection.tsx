import { useMemo } from 'react'
import { Pressable, ScrollView, View } from 'react-native'

import { Badge, Text } from '~/components/ui'
import { cn } from '~/lib/utils'

type MetadataBadgeItem = {
	label: string
	// TODO: It might be better to have an getPressHandler or something so that it can evaluate whether
	// onPress will actually do anything. I'm too lazy right now
	onPress?: () => void
}

type Props = {
	label: string
	items: MetadataBadgeItem[]
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
			<Text className="ios:px-4 px-2 text-lg font-semibold text-foreground-muted">{label}</Text>

			<ScrollView
				horizontal
				showsHorizontalScrollIndicator={false}
				contentContainerClassName="ios:px-4 gap-2 px-2"
			>
				<View className="gap-2">
					{rows.map((row, rowIndex) => (
						<View key={rowIndex} className="flex-row gap-2">
							{row.map((item, itemIndex) => (
								<Pressable
									key={`${item.label}-${itemIndex}`}
									onPress={item.onPress}
									disabled={!item.onPress}
								>
									{({ pressed }) => (
										<Badge
											className={cn({
												'opacity-80': pressed,
												'border border-edge bg-background-surface-secondary': item.onPress,
											})}
										>
											<Text className="text-sm">{item.label}</Text>
										</Badge>
									)}
								</Pressable>
							))}
						</View>
					))}
				</View>
			</ScrollView>
		</View>
	)
}
