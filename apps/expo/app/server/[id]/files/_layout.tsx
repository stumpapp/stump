import { Stack } from 'expo-router'
import { Platform, View } from 'react-native'

import ChevronBackLink from '~/components/ChevronBackLink'
import { ENABLE_LARGE_HEADER, IS_IOS_24_PLUS } from '~/lib/constants'
import { usePreferencesStore } from '~/stores'

export default function Screen() {
	const animationEnabled = usePreferencesStore((state) => !state.reduceAnimations)

	return (
		<Stack
			screenOptions={{
				headerShown: false,
				animation: animationEnabled ? 'default' : 'none',
			}}
		>
			<Stack.Screen
				name="index"
				options={{
					headerShown: true,
					headerTitle: 'Files',
					headerLeft:
						Platform.OS === 'android'
							? undefined
							: () => (
									<View
										style={{
											width: 35,
											height: 35,
											justifyContent: 'center',
											alignItems: 'center',
										}}
									>
										<ChevronBackLink />
									</View>
								),
					headerTransparent: Platform.OS === 'ios',
					headerLargeTitleStyle: {
						fontSize: 24,
					},
					headerBlurEffect: IS_IOS_24_PLUS ? undefined : 'regular',
					headerLargeTitle: ENABLE_LARGE_HEADER,
				}}
			/>

			<Stack.Screen
				name="[path]"
				options={{
					headerShown: true,
					headerTitle: '',
					headerTransparent: Platform.OS === 'ios',
					headerBlurEffect: IS_IOS_24_PLUS ? undefined : 'regular',
				}}
				dangerouslySingular
			/>
		</Stack>
	)
}
