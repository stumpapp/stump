import { Stack, useNavigation } from 'expo-router'
import { Ellipsis } from 'lucide-react-native'
import { useLayoutEffect } from 'react'
import { Platform, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import {
	Button,
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuLabel,
	DropdownMenuTrigger,
	Icon,
	Text,
} from '~/components/ui'
import { useReadingTimelineDisplayStore } from '~/stores/readingTimeline'

export function BookReadingTimelineMenu() {
	const navigation = useNavigation()

	useLayoutEffect(() => {
		if (Platform.OS === 'android') {
			navigation.setOptions({
				headerRight: () => <AndroidTimelineMenu />,
			})
		}
	}, [navigation])

	if (Platform.OS !== 'ios') return null

	return <IosTimelineMenu />
}

function IosTimelineMenu() {
	const feedType = useReadingTimelineDisplayStore((state) => state.feedType)
	const patchDisplay = useReadingTimelineDisplayStore((state) => state.patchStore)

	return (
		<Stack.Toolbar placement="right">
			<Stack.Toolbar.Menu icon="ellipsis" cornerRadius={16}>
				<Stack.Toolbar.Menu title="Timeline" cornerRadius={16}>
					<Stack.Toolbar.MenuAction
						onPress={() => patchDisplay({ feedType: 'sessions' })}
						isOn={feedType === 'sessions'}
					>
						Sessions
					</Stack.Toolbar.MenuAction>
					<Stack.Toolbar.MenuAction
						onPress={() => patchDisplay({ feedType: 'events' })}
						isOn={feedType === 'events'}
					>
						Events
					</Stack.Toolbar.MenuAction>
				</Stack.Toolbar.Menu>
			</Stack.Toolbar.Menu>
		</Stack.Toolbar>
	)
}

function AndroidTimelineMenu() {
	const insets = useSafeAreaInsets()

	const feedType = useReadingTimelineDisplayStore((state) => state.feedType)
	const patchDisplay = useReadingTimelineDisplayStore((state) => state.patchStore)

	const contentInsets = {
		top: insets.top,
		bottom: insets.bottom,
		left: 4,
		right: 4,
	}

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button className="squircle mr-2" variant="ghost" size="icon">
					{({ pressed }) => (
						<View className="squircle p-2 items-center justify-center rounded-full">
							<Icon
								as={Ellipsis}
								size={20}
								className="text-foreground"
								style={{
									opacity: pressed ? 0.7 : 1,
								}}
							/>
						</View>
					)}
				</Button>
			</DropdownMenuTrigger>

			<DropdownMenuContent
				insets={contentInsets}
				sideOffset={2}
				className="tablet:w-64 w-2/3"
				align="end"
			>
				<DropdownMenuGroup>
					<DropdownMenuLabel className="text-foreground-muted">Timeline</DropdownMenuLabel>
					<DropdownMenuCheckboxItem
						checked={feedType === 'sessions'}
						onCheckedChange={() => patchDisplay({ feedType: 'sessions' })}
					>
						<Text className="text-lg">Sessions</Text>
					</DropdownMenuCheckboxItem>
					<DropdownMenuCheckboxItem
						checked={feedType === 'events'}
						onCheckedChange={() => patchDisplay({ feedType: 'events' })}
					>
						<Text className="text-lg">Events</Text>
					</DropdownMenuCheckboxItem>
				</DropdownMenuGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	)
}
