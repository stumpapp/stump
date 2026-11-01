import {
	Button,
	ContextMenu as SwiftContextMenu,
	Divider,
	Host,
	Image,
	RNHostView,
	Text,
} from '@expo/ui/swift-ui'
import { disabled as disabledModifier } from '@expo/ui/swift-ui/modifiers'
import { Fragment } from 'react'
import { Pressable } from 'react-native'

import { ContextMenuProps } from './types'

export function ContextMenu({ groups, disabled, children, onPress }: ContextMenuProps) {
	return (
		<Host matchContents={{ vertical: true }} style={{ width: '100%' }}>
			<SwiftContextMenu>
				<SwiftContextMenu.Trigger>
					<RNHostView matchContents={{ vertical: true }}>
						<Pressable onPress={onPress} onLongPress={() => {}}>
							{children}
						</Pressable>
					</RNHostView>
				</SwiftContextMenu.Trigger>

				<SwiftContextMenu.Items>
					{groups.map((group, groupIndex) => (
						<Fragment key={groupIndex}>
							{groupIndex > 0 && <Divider />}
							{group.items.map((item, itemIndex) => {
								const sharedProps = {
									onPress: item.onPress,
									role: item.role,
									modifiers: [disabledModifier(!!(disabled || item.disabled))],
								}
								const key = `group-${groupIndex}-item-${itemIndex}-${item.label}`

								if (item.subtext) {
									return (
										<Button key={key} {...sharedProps}>
											{[
												...(item.icon.ios ? [<Image key="icon" systemName={item.icon.ios} />] : []),
												<Text key="title">{item.label}</Text>,
												<Text key="subtext">{item.subtext}</Text>,
											]}
										</Button>
									)
								}

								return (
									<Button
										key={key}
										label={item.label}
										systemImage={item.icon.ios}
										{...sharedProps}
									/>
								)
							})}
						</Fragment>
					))}
				</SwiftContextMenu.Items>
			</SwiftContextMenu>
		</Host>
	)
}
