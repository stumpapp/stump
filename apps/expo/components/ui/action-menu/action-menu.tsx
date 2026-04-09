import { Ellipsis } from 'lucide-react-native'
import { Fragment, useState } from 'react'
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

export function ActionMenu({ icon, groups, androidProps, disabled }: ActionMenuProps) {
	const insets = useSafeAreaInsets()
	const TriggerIcon = icon?.android ?? Ellipsis
	const contentInsets = {
		top: insets.top,
		bottom: insets.bottom,
		left: 4,
		right: 4,
	}

	const [isOpen, setIsOpen] = useState(false)

	const renderGroup = (group: ActionMenuProps['groups'][number], groupIndex: number) => {
		return (
			<Fragment key={`action-menu-group-${groupIndex}-items-${group.items.length}`}>
				{groupIndex > 0 && <DropdownMenuSeparator />}
				<DropdownMenuGroup>
					{group.items.map((item, itemIndex) => (
						<DropdownMenuItem
							key={itemIndex}
							onPress={item.onPress}
							className="flex-row items-center"
							disabled={item.disabled}
							variant={item.role === 'destructive' ? 'destructive' : 'default'}
						>
							<Icon
								as={item.icon.android}
								size={16}
								className={cn('mr-2 text-foreground', {
									'text-fill-danger': item.role === 'destructive',
								})}
							/>
							<Text className="text-lg">{item.label}</Text>
						</DropdownMenuItem>
					))}
				</DropdownMenuGroup>
			</Fragment>
		)
	}

	return (
		<DropdownMenu onOpenChange={setIsOpen}>
			<DropdownMenuTrigger asChild disabled={disabled}>
				<Button className="squircle rounded-full" variant="ghost" size="icon">
					{({ pressed }) => (
						<View
							className={cn(
								'squircle p-2 items-center justify-center rounded-full border border-transparent bg-transparent transition-colors duration-200',
								{
									'bg-black/10 dark:bg-white/5 border-edge': isOpen,
								},
							)}
						>
							<Icon
								as={TriggerIcon}
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
				sideOffset={androidProps?.sideOffset ?? 2}
				className={cn('tablet:w-64 w-3/5', androidProps?.className)}
				align={androidProps?.align || 'end'}
			>
				{groups.map((group, index) => renderGroup(group, index))}
			</DropdownMenuContent>
		</DropdownMenu>
	)
}
