import { Host, Image } from '@expo/ui/swift-ui'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { MessageCircle } from 'lucide-react-native'
import { Platform, Pressable, View } from 'react-native'

import { useActiveServer } from '~/components/activeServer'
import { Icon, Text } from '~/components/ui'

type Props = {
	id: string
	name: string
	messageCount: number
}

// TODO(book-club): Context menu for management (admins only)
export default function DiscussionListItem({ id, name, messageCount }: Props) {
	const { clubId } = useLocalSearchParams<{ clubId: string }>()
	const router = useRouter()
	const {
		activeServer: { id: serverID },
	} = useActiveServer()

	return (
		<Pressable
			onPress={() => router.push(`/server/${serverID}/clubs/${clubId}/discussion/${id}`)}
			className="flex-row items-center justify-between p-3"
		>
			<Text className="flex-1 font-medium" numberOfLines={1}>
				{name}
			</Text>
			<View className="flex-row items-center gap-1">
				{MessageIcon}
				<Text className="text-muted-foreground text-sm">{messageCount}</Text>
			</View>
		</Pressable>
	)
}

const MessageIcon = Platform.select({
	ios: (
		<Host matchContents>
			<Image systemName="message" size={14} />
		</Host>
	),
	android: <Icon as={MessageCircle} className="shadow" size={14} />,
})
