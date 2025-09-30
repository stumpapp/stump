import { Stack, useNavigation } from 'expo-router'
import { ChevronLeft } from 'lucide-react-native'
import { Platform, View } from 'react-native'

import { Icon } from '~/components/ui/icon'
import { IS_IOS_24_PLUS } from '~/lib/constants'

export default function Screen() {
	const navigation = useNavigation()

	return (
		<Stack
			screenOptions={{
				headerShown: false,
			}}
		>
			<Stack.Screen
				name="index"
				options={{
					headerTitle: '',
					headerShown: Platform.OS === 'ios',
					headerTransparent: true,
					headerBlurEffect: IS_IOS_24_PLUS ? undefined : 'regular',
					headerLeft: () => (
						<View style={{ width: 35, height: 35, justifyContent: 'center', alignItems: 'center' }}>
							<Icon
								as={ChevronLeft}
								className="text-foreground"
								onPress={() => navigation.goBack()}
								size={24}
							/>
						</View>
					),
				}}
			/>

			<Stack.Screen
				name="ebook-settings"
				options={{
					presentation: 'modal',
					headerShown: false,
				}}
			/>

			<Stack.Screen
				name="ebook-locations-modal"
				options={{
					presentation: 'modal',
					headerShown: false,
				}}
			/>
		</Stack>
	)
}
