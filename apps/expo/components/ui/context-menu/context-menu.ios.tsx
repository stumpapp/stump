import { Pressable } from 'react-native'
import * as ZContextMenu from 'zeego/context-menu'

import { ContextMenuProps } from './types'

export function ContextMenu({ groups, disabled, children, onPress }: ContextMenuProps) {
	return (
		<ZContextMenu.Root>
			<ZContextMenu.Trigger className="w-full">
				<Pressable onPress={onPress} onLongPress={() => {}}>
					{children}
				</Pressable>
			</ZContextMenu.Trigger>

			<ZContextMenu.Content>
				{groups.map((group, groupIndex) => (
					<ZContextMenu.Group key={groupIndex}>
						{group.items.map((item, itemIndex) => (
							<ZContextMenu.Item
								key={`group-${groupIndex}-item-${itemIndex}-${item.label}`}
								onSelect={item.onPress}
								disabled={disabled || item.disabled}
								destructive={item.role === 'destructive'}
							>
								<ZContextMenu.ItemTitle>{item.label}</ZContextMenu.ItemTitle>
								{item.subtext && (
									<ZContextMenu.ItemSubtitle>{item.subtext}</ZContextMenu.ItemSubtitle>
								)}
								{item.icon.ios && (
									<ZContextMenu.ItemIcon
										ios={{
											name: item.icon.ios,
										}}
									/>
								)}
							</ZContextMenu.Item>
						))}
					</ZContextMenu.Group>
				))}
			</ZContextMenu.Content>
		</ZContextMenu.Root>
	)
}
