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
	const { translate } = useTranslate()

	const order = useReadingTimelineDisplayStore((state) => state.order)
	const feedType = useReadingTimelineDisplayStore((state) => state.feedType)
	const groupBy = useReadingTimelineDisplayStore((state) => state.groupBy)
	const patchDisplay = useReadingTimelineDisplayStore((state) => state.patchStore)

	return (
		<Stack.Toolbar placement="right">
			<Stack.Toolbar.Menu icon="ellipsis" cornerRadius={16}>
				<Stack.Toolbar.Menu title="Timeline" cornerRadius={16}>
					<Stack.Toolbar.MenuAction
						onPress={() => patchDisplay({ feedType: 'sessions' })}
						isOn={feedType === 'sessions'}
					>
						{translate('shared.readingTimeline.feedType.sessions')}
					</Stack.Toolbar.MenuAction>
					<Stack.Toolbar.MenuAction
						onPress={() => patchDisplay({ feedType: 'events' })}
						isOn={feedType === 'events'}
					>
						{translate('shared.readingTimeline.feedType.events')}
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
						{translate('shared.common.time.day')}
					</Stack.Toolbar.MenuAction>
					<Stack.Toolbar.MenuAction
						onPress={() =>
							patchDisplay({
								groupBy: 'month',
							})
						}
						isOn={groupBy === 'month'}
					>
						{translate('shared.common.time.month')}
					</Stack.Toolbar.MenuAction>
				</Stack.Toolbar.Menu>

				<Stack.Toolbar.MenuAction
					onPress={() =>
						patchDisplay({
							order: order === OrderDirection.Asc ? OrderDirection.Desc : OrderDirection.Asc,
						})
					}
					subtitle={translate(`shared.sorting.sortDirectionDate.${order}`)}
				>
					{translate('shared.sorting.sortOrderLabel')}
				</Stack.Toolbar.MenuAction>
			</Stack.Toolbar.Menu>
		</Stack.Toolbar>
	)
}

function AndroidTimelineMenu() {
	const { translate } = useTranslate()
	const insets = useSafeAreaInsets()

	const order = useReadingTimelineDisplayStore((state) => state.order)
	const feedType = useReadingTimelineDisplayStore((state) => state.feedType)
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
					<DropdownMenuCheckboxItem
						checked={feedType === 'sessions'}
						onCheckedChange={() => patchDisplay({ feedType: 'sessions' })}
					>
						<Text className="text-lg">{translate('shared.readingTimeline.feedType.sessions')}</Text>
					</DropdownMenuCheckboxItem>
					<DropdownMenuCheckboxItem
						checked={feedType === 'events'}
						onCheckedChange={() => patchDisplay({ feedType: 'events' })}
					>
						<Text className="text-lg">{translate('shared.readingTimeline.feedType.events')}</Text>
					</DropdownMenuCheckboxItem>
				</DropdownMenuGroup>

				<DropdownMenuSeparator />

				<DropdownMenuGroup>
					<DropdownMenuLabel className="text-foreground-muted">
						{translate('shared.common.groupBy')}
					</DropdownMenuLabel>
					<DropdownMenuCheckboxItem
						checked={groupBy === 'day'}
						onCheckedChange={() => patchDisplay({ groupBy: 'day' })}
					>
						<Text className="text-lg">{translate('shared.common.time.day')}</Text>
					</DropdownMenuCheckboxItem>
					<DropdownMenuCheckboxItem
						checked={groupBy === 'month'}
						onCheckedChange={() => patchDisplay({ groupBy: 'month' })}
					>
						<Text className="text-lg">{translate('shared.common.time.month')}</Text>
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
						<Text className="text-lg">{translate('shared.sorting.sortOrderLabel')}</Text>
						<Text className="text-sm text-foreground-muted">
							{translate(`shared.sorting.sortDirectionDate.${order}`)}
						</Text>
					</View>
					<Icon as={ArrowDownUp} size={20} className={cn('text-foreground-muted ml-auto')} />
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	)
}
