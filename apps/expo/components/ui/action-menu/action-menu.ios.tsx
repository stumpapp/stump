import { Button, ContextMenu, Divider, Host, Image } from '@expo/ui/swift-ui'
import { View } from 'react-native'

import type { ActionMenuProps } from './types'

export function ActionMenu({ groups }: ActionMenuProps) {
	return (
		<Host matchContents>
			<ContextMenu>
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
							<Image systemName="ellipsis" />
						</Host>
					</View>
				</ContextMenu.Trigger>
				<ContextMenu.Items>
					{groups.map((group, groupIndex) => (
						<>
							{group.items.map((item, itemIndex) => (
								<Button
									key={`${groupIndex}-${itemIndex}`}
									systemImage={typeof item.icon === 'string' ? item.icon : item.icon.ios}
									onPress={item.onPress}
									role={item.role}
								>
									{item.label}
								</Button>
							))}

							{groupIndex < groups.length - 1 && <Divider />}
						</>
					))}
				</ContextMenu.Items>
			</ContextMenu>
		</Host>
	)
}
