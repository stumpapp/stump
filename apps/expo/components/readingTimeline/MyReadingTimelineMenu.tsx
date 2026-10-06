import { OrderDirection } from '@stump/graphql'
import { Stack, useNavigation } from 'expo-router'
import { ArrowDownUp, Ellipsis } from 'lucide-react-native'
import { useLayoutEffect } from 'react'
import { Platform, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import {
	Button,
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
	Icon,
	Text,
} from '~/components/ui'
import { useTranslate } from '~/lib/hooks'
import { cn } from '~/lib/utils'
import { useReadingTimelineDisplayStore } from '~/stores/readingTimeline'

// TODO(reading-timeline): support event vs session view modalities

export function MyReadingTimelineMenu() {
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
	const { t } = useTranslate()

	const order = useReadingTimelineDisplayStore((state) => state.order)
	const groupBy = useReadingTimelineDisplayStore((state) => state.groupBy)
	const patchDisplay = useReadingTimelineDisplayStore((state) => state.patchStore)

	return (
		<Stack.Toolbar placement="right">
			<Stack.Toolbar.Menu icon="ellipsis" cornerRadius={16}>
				<Stack.Toolbar.Menu title="Timeline" cornerRadius={16}>
					<Stack.Toolbar.MenuAction onPress={() => {}} isOn disabled>
						Sessions
					</Stack.Toolbar.MenuAction>
					<Stack.Toolbar.MenuAction onPress={() => {}} disabled>
						Events
					</Stack.Toolbar.MenuAction>
				</Stack.Toolbar.Menu>

				<Stack.Toolbar.Menu title="Group By" cornerRadius={16}>
					<Stack.Toolbar.MenuAction
						onPress={() =>
							patchDisplay({
								groupBy: 'day',
							})
						}
						isOn={groupBy === 'day'}
					>
						Day
					</Stack.Toolbar.MenuAction>
					<Stack.Toolbar.MenuAction
						onPress={() =>
							patchDisplay({
								groupBy: 'month',
							})
						}
						isOn={groupBy === 'month'}
					>
						Month
					</Stack.Toolbar.MenuAction>
				</Stack.Toolbar.Menu>

				<Stack.Toolbar.MenuAction
					onPress={() =>
						patchDisplay({
							order: order === OrderDirection.Asc ? OrderDirection.Desc : OrderDirection.Asc,
						})
					}
					subtitle={t(`sorting.sortDirectionDate.${order}`)}
				>
					Sort Order
				</Stack.Toolbar.MenuAction>
			</Stack.Toolbar.Menu>
		</Stack.Toolbar>
	)
}

function AndroidTimelineMenu() {
	const { t } = useTranslate()
	const insets = useSafeAreaInsets()

	const order = useReadingTimelineDisplayStore((state) => state.order)
	const groupBy = useReadingTimelineDisplayStore((state) => state.groupBy)
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
					<DropdownMenuCheckboxItem checked onCheckedChange={() => {}} disabled>
						<Text className="text-lg">Sessions</Text>
					</DropdownMenuCheckboxItem>
					<DropdownMenuCheckboxItem checked={false} onCheckedChange={() => {}} disabled>
						<Text className="text-lg">Events</Text>
					</DropdownMenuCheckboxItem>
				</DropdownMenuGroup>

				<DropdownMenuSeparator />

				<DropdownMenuGroup>
					<DropdownMenuLabel className="text-foreground-muted">Group By</DropdownMenuLabel>
					<DropdownMenuCheckboxItem
						checked={groupBy === 'day'}
						onCheckedChange={() => patchDisplay({ groupBy: 'day' })}
					>
						<Text className="text-lg">Day</Text>
					</DropdownMenuCheckboxItem>
					<DropdownMenuCheckboxItem
						checked={groupBy === 'month'}
						onCheckedChange={() => patchDisplay({ groupBy: 'month' })}
					>
						<Text className="text-lg">Month</Text>
					</DropdownMenuCheckboxItem>
				</DropdownMenuGroup>

				<DropdownMenuSeparator />

				<DropdownMenuItem
					onPress={() =>
						patchDisplay({
							order: order === OrderDirection.Asc ? OrderDirection.Desc : OrderDirection.Asc,
						})
					}
				>
					<View className="flex-1 justify-center">
						<Text className="text-lg">Sort Order</Text>
						<Text className="text-sm text-foreground-muted">
							{t(`sorting.sortDirectionDate.${order}`)}
						</Text>
					</View>
					<Icon as={ArrowDownUp} size={20} className={cn('text-foreground-muted ml-auto')} />
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	)
}
