import { Link, Tabs } from 'expo-router'
import { View } from 'nativewind/dist/preflight'
import { Books, Gear, House } from 'phosphor-react-native'
import { SafeAreaView } from 'react-native'

export default function HomeLayout() {
	return (
		<Tabs>
			<Tabs.Screen
				options={{
					headerRight: (props) => <_HeaderRight props={props} />,
					tabBarIcon: ({ color }) => <House color={color} />,
					title: 'Home',
				}}
				name="HomeTab"
			/>
			<Tabs.Screen
				options={{
					headerRight: (props) => <_HeaderRight props={props} />,
					tabBarIcon: ({ color }) => <Books color={color} />,
					title: 'Libraries',
				}}
				name="LibrariesTab"
			/>

			{/* This tab shouldn't be shown as a tab */}
			<Tabs.Screen
				options={{
					href: null,
				}}
				name="libraries/[id]"
			/>
		</Tabs>
	)
}

const _HeaderRight = ({ props }) => {
	return (
		<SafeAreaView className="flex-1 justify-center">
			<View />
			<Link className={'mx-5'} href={'/settings'}>
				<Gear size={24} />
			</Link>
		</SafeAreaView>
	)
}
