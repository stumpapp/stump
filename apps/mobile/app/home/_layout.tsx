import { Link, Stack, Tabs } from 'expo-router'
import { View } from 'nativewind/dist/preflight'
import { Books, Gear, House } from 'phosphor-react-native'
import { SafeAreaView } from 'react-native'

export default function HomeLayout() {
	return (
		<>
			<Stack.Screen options={{ gestureEnabled: false, headerShown: false }} />
			<Tabs>
				<Tabs.Screen
					options={{
						headerRight: () => <_HeaderRight />,
						tabBarIcon: ({ color }) => <House color={color} />,
						title: 'Home',
					}}
					name="home_tab"
				/>
				<Tabs.Screen
					options={{
						headerRight: () => <_HeaderRight />,
						tabBarIcon: ({ color }) => <Books color={color} />,
						title: 'Libraries',
					}}
					name="libraries_tab"
				/>
			</Tabs>
		</>
	)
}

const _HeaderRight = () => {
	return (
		<SafeAreaView className="flex-1 justify-center">
			<View />
			<Link className={'mx-5'} href={'/settings'}>
				<Gear size={24} />
			</Link>
		</SafeAreaView>
	)
}
