import { Button, ContextMenu, Host, Image } from '@expo/ui/swift-ui'
import { View } from 'react-native'

import type { ActionMenuProps } from './types'

export function ActionMenu({ groups }: ActionMenuProps) {
	const flattenedItems = groups.flatMap((group) => group.items)

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
					{flattenedItems.map((item, index) => (
						<Button key={index} systemImage={item.icon.ios} onPress={item.onPress}>
							{item.label}
						</Button>
					))}
				</ContextMenu.Items>
			</ContextMenu>
		</Host>
	)
}
