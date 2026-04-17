import { Stack, useNavigation } from 'expo-router'
import { useLayoutEffect } from 'react'
import { Platform } from 'react-native'

// this is kinda really irritating, but Stack.Toolbar seems to be VERY strict
// about children, effectively checking whether the direct child is e.g.
// a Stack.Toolbar.Menu, and if not, it just doesn't render anything. so composability
// is shit, hopefully this gets better over time. for now, the hook renders the inline
// jsx which should work, but something like <SeriesSortAndDisplayMenu /> would not be
// recognized as valid

export function useSeriesSortAndDisplayMenu() {
	const navigation = useNavigation()
	useLayoutEffect(() => {
		if (Platform.OS === 'android') {
			// navigation.setOptions({
			// 	// headerRight: () => <SeriesSortAndDisplayMenu />,
			// })
		}
	}, [navigation])

	// todo: make functional
	if (Platform.OS === 'ios') {
		return (
			<Stack.Toolbar.Menu icon="ellipsis">
				<Stack.Toolbar.Menu inline>
					<Stack.Toolbar.MenuAction icon="rectangle.grid.1x2" disabled>
						Grid
					</Stack.Toolbar.MenuAction>
					<Stack.Toolbar.MenuAction icon="list.bullet" disabled>
						List
					</Stack.Toolbar.MenuAction>
				</Stack.Toolbar.Menu>

				<Stack.Toolbar.Menu inline title="Sort By...">
					<Stack.Toolbar.MenuAction isOn subtitle="A → Z">
						Name
					</Stack.Toolbar.MenuAction>
					<Stack.Toolbar.MenuAction>Date Added</Stack.Toolbar.MenuAction>
					<Stack.Toolbar.MenuAction>Year Published</Stack.Toolbar.MenuAction>
				</Stack.Toolbar.Menu>
			</Stack.Toolbar.Menu>
		)
	}

	return null
}

function AndroidMenu() {}
