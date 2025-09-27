import { Suspense } from 'react'
import { View } from 'react-native'
import { ScrollView } from 'react-native-gesture-handler'

type Props = {
	children: React.ReactNode
}

export default function FilterHeader({ children }: Props) {
	return (
		<View className="h-min shrink-0" /* seems to be h-[35] on my iphone but 38 on ipad */>
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
