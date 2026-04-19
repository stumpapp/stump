import { Stack, useNavigation } from 'expo-router'
import { ReactNode, useLayoutEffect } from 'react'
import { Platform, View } from 'react-native'

type Props = {
	filterMenu: ReactNode | null
	sortMenu: ReactNode | null
}

export function useEntityListHeader({ filterMenu, sortMenu }: Props) {
	const navigation = useNavigation()

	useLayoutEffect(() => {
		if (Platform.OS === 'android') {
			navigation.setOptions({
				headerRight: () => (
					<View className="gap-2 flex-row">
						{filterMenu}
						{sortMenu}
					</View>
				),
			})
		}
	}, [navigation, filterMenu, sortMenu])

	if (Platform.OS === 'ios') {
		return (
			<Stack.Toolbar placement="right">
				{filterMenu}
				{sortMenu}
			</Stack.Toolbar>
		)
	}

	return null
}
