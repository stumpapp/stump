import { Ellipsis } from 'lucide-react-native'
import { Fragment } from 'react'
import { View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { cn } from '~/lib/utils'

import { Button } from '../button'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '../dropdown-menu'
import { Icon } from '../icon'
import { Text } from '../text'
import { ActionMenuProps } from './types'

export function ActionMenu({ groups, androidProps }: ActionMenuProps) {
	const insets = useSafeAreaInsets()
	const contentInsets = {
		top: insets.top,
		bottom: insets.bottom,
		left: 4,
		right: 4,
	}

	const renderGroup = (group: ActionMenuProps['groups'][number], groupIndex: number) => {
		return (
			<Fragment key={groupIndex}>
				{groupIndex > 0 && <DropdownMenuSeparator />}
				<DropdownMenuGroup>
					{group.items.map((item, itemIndex) => (
						<DropdownMenuItem
							key={itemIndex}
							onPress={item.onPress}
							className="flex-row items-center"
						>
							<Icon as={item.icon.android} size={16} className="mr-2 text-foreground" />
							<Text className="text-lg">{item.label}</Text>
						</DropdownMenuItem>
					))}
				</DropdownMenuGroup>
			</Fragment>
		)
	}

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button className="squircle h-8 w-8 rounded-full p-0" variant="ghost" size="icon">
					<View>
						<Ellipsis size={20} className="text-foreground" />
					</View>
				</Button>
			</DropdownMenuTrigger>

			<DropdownMenuContent
				insets={contentInsets}
				sideOffset={androidProps?.sideOffset ?? 2}
				className={cn('w-3/5 tablet:w-64', androidProps?.className)}
				align={androidProps?.align || 'end'}
			>
				{groups.map((group, index) => renderGroup(group, index))}
			</DropdownMenuContent>
		</DropdownMenu>
	)
}
