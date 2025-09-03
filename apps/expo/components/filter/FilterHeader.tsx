import { Suspense } from 'react'
import { View } from 'react-native'
import { ScrollView } from 'react-native-gesture-handler'

type Props = {
	children: React.ReactNode
}

export default function FilterHeader({ children }: Props) {
	return (
		<View className="h-12 shrink-0">
			<ScrollView
				showsHorizontalScrollIndicator={false}
				showsVerticalScrollIndicator={false}
				horizontal
			>
				<Suspense>{children}</Suspense>
			</ScrollView>
		</View>
	)
}
