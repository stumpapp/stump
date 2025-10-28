import { Stack } from 'expo-router'

export default function Screen() {
	return (
		<Stack
			screenOptions={{
				headerShown: false,
			}}
		>
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
