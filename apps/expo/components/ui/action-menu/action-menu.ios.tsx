import { Button, ContextMenu, Divider, Host, Image } from '@expo/ui/swift-ui'
import { disabled } from '@expo/ui/swift-ui/modifiers'
import { Fragment } from 'react'
import { View } from 'react-native'

import type { ActionMenuProps } from './types'

export function ActionMenu({ icon, groups, disabled: isDisabled }: ActionMenuProps) {
	return (
		<Host matchContents>
			<ContextMenu modifiers={[disabled(isDisabled ?? false)]}>
				<ContextMenu.Trigger>
					<View
						accessibilityLabel="options"
						style={{
							height: 35,
							width: 35,
							justifyContent: 'center',
							alignItems: 'center',
						}}
					>
						<Host matchContents>
							<Image systemName={icon?.ios ?? 'ellipsis'} />
						</Host>
					</View>
				</ContextMenu.Trigger>
				<ContextMenu.Items>
					{groups.map((group, groupIndex) => (
						<Fragment
							key={`group-${groupIndex}-${group.items.map((item) => item.label).join('-')}`}
						>
							{group.items.map((item, itemIndex) => (
								<Button
									key={`${groupIndex}-${itemIndex}-${item.label}`}
									systemImage={typeof item.icon === 'string' ? item.icon : item.icon.ios}
									onPress={item.onPress}
									role={item.role}
									disabled={item.disabled}
								>
									{item.label}
								</Button>
							))}

							{groupIndex < groups.length - 1 && <Divider />}
						</Fragment>
					))}
				</ContextMenu.Items>
			</ContextMenu>
		</Host>
	)
}
