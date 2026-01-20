import { usePortalHost } from '~/lib/PortalHostContext'

import { Text } from '../text'
import * as JSBase from './base-js'
import { ContextMenuProps } from './types'

export function ContextMenu({ groups, disabled, children, onPress }: ContextMenuProps) {
	const portalHost = usePortalHost()

	return (
		<JSBase.ContextMenu>
			<JSBase.ContextMenuTrigger onPress={onPress}>{children}</JSBase.ContextMenuTrigger>
			<JSBase.ContextMenuContent portalHost={portalHost}>
				{groups.map((group, groupIndex) => (
					<JSBase.ContextMenuGroup key={groupIndex}>
						{group.items.map((item, itemIndex) => (
							<JSBase.ContextMenuItem
								key={`group-${groupIndex}-item-${itemIndex}-${item.label}`}
								onPress={item.onPress}
								disabled={disabled || item.disabled}
								variant={item.role}
							>
								<Text>{item.label}</Text>
								{item.subtext && (
									<Text className="text-xs text-foreground-muted">{item.subtext}</Text>
								)}
							</JSBase.ContextMenuItem>
						))}
					</JSBase.ContextMenuGroup>
				))}
			</JSBase.ContextMenuContent>
		</JSBase.ContextMenu>
	)
}
