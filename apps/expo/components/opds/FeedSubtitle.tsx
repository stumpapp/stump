import { TrueSheet } from '@lodev09/react-native-true-sheet'
import { Fragment, useRef } from 'react'
import { Platform, Pressable, ScrollView } from 'react-native'

import { Text } from '~/components/ui'
import { IS_IOS_24_PLUS, useColors } from '~/lib/constants'
import { useColorScheme } from '~/lib/useColorScheme'

type Props = {
	value: string
}

export default function FeedSubtitle({ value }: Props) {
	const ref = useRef<TrueSheet | null>(null)

	const colors = useColors()
	const { isDarkColorScheme } = useColorScheme()

	return (
		<Fragment>
			<Pressable onPress={() => ref.current?.present()}>
				<Text className="text-foreground-muted" numberOfLines={3}>
					{value}
				</Text>
			</Pressable>

			<TrueSheet
				ref={ref}
				// Android acts as if detents={[1]} when using scrollable and 'auto' so just set a smaller and larger size
				detents={Platform.OS === 'android' ? [0.4, 1] : ['auto']}
				grabber
				scrollable
				backgroundColor={IS_IOS_24_PLUS ? undefined : colors.background.DEFAULT}
				grabberOptions={{ color: isDarkColorScheme ? '#333' : '#ccc' }}
			>
				<ScrollView className="flex-1 p-6">
					<Text className="text-foreground">{value}</Text>
				</ScrollView>
			</TrueSheet>
		</Fragment>
	)
}
