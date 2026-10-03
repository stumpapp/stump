import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { cn } from '~/lib/utils'
import { usePortalHost } from '~/providers/PortalHostProvider'

import { Icon } from '../icon'
import { Text } from '../text'
import * as JSBase from './base-js'
import { ContextMenuProps } from './types'

export function ContextMenu({ groups, disabled, children, onPress }: ContextMenuProps) {
	const portalHost = usePortalHost()
	const insets = useSafeAreaInsets()

	const contentInsets = {
		top: insets.top,
		bottom: insets.bottom,
		left: 12,
		right: 12,
	}

	return (
		<JSBase.ContextMenu relativeTo="trigger">
			<JSBase.ContextMenuTrigger onPress={onPress}>{children}</JSBase.ContextMenuTrigger>
			<JSBase.ContextMenuContent
				portalHost={portalHost?.name}
				avoidCollisions
				insets={contentInsets}
				sideOffset={6}
				// ^ prolly not putting context menus in sheets so just keeping fixed offset for now
			>
				{groups.map((group, groupIndex) => (
					<JSBase.ContextMenuGroup key={groupIndex}>
						{group.items.map((item, itemIndex) => {
							const icon = 'icon' in item.icon.android ? item.icon.android.icon : item.icon.android
							const fillColor =
								'icon' in item.icon.android && item.icon.android.fill
									? item.icon.android.fill
									: undefined
							const strokeColor =
								'icon' in item.icon.android && item.icon.android.stroke
									? item.icon.android.stroke
									: undefined

							return (
								<JSBase.ContextMenuItem
									key={`group-${groupIndex}-item-${itemIndex}-${item.label}`}
									onPress={item.onPress}
									disabled={disabled || item.disabled}
									variant={item.role}
								>
									{icon && (
										<Icon
											as={icon}
											className={cn('size-6 text-foreground-muted', {
												'text-fill-danger': item.role === 'destructive',
											})}
											{...(fillColor ? { fill: fillColor } : {})}
											{...(strokeColor ? { stroke: strokeColor } : {})}
										/>
									)}
									<Text>{item.label}</Text>
									{/* TODO: Make subtext not look garbo */}
									{/* {item.subtext && <Text className="text-foreground-muted">{item.subtext}</Text>} */}
								</JSBase.ContextMenuItem>
							)
						})}
					</JSBase.ContextMenuGroup>
				))}
			</JSBase.ContextMenuContent>
		</JSBase.ContextMenu>
	)
}
