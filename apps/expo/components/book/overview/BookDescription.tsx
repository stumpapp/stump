import { Platform, View } from 'react-native'
import * as ContextMenu from 'zeego/context-menu'

import { Text } from '~/components/ui'

import InfoRow from './InfoRow'

const isAndroid = Platform.OS === 'android'

type Props = {
	description: string
}

export default function BookDescription({ description }: Props) {
	// TODO: something better on android, preview not supported
	if (isAndroid) {
		return <InfoRow label="Description" value={description} longValue />
	}

	return (
		<View className="flex flex-row items-start justify-between p-3">
			<Text className="shrink-0 text-foreground-muted">Description</Text>
			<View className="max-w-[75%]">
				<ContextMenu.Root>
					<ContextMenu.Trigger>
						<Text className="text-right" numberOfLines={4} ellipsizeMode="tail">
							{description}
						</Text>
					</ContextMenu.Trigger>

					<ContextMenu.Content>
						<ContextMenu.Preview size={description.length > 400 ? 'STRETCH' : undefined}>
							{() => (
								<View className="bg-background-opaque p-3">
									<Text className="text-foreground">{description}</Text>
								</View>
							)}
						</ContextMenu.Preview>
					</ContextMenu.Content>
				</ContextMenu.Root>
			</View>
		</View>
	)
}
