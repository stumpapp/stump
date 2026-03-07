import { Host, Image } from '@expo/ui/swift-ui'
import { FragmentType, graphql, useFragment } from '@stump/graphql'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Archive, Hash, Lock, MessageCircle } from 'lucide-react-native'
import { Platform, Pressable, View } from 'react-native'

import { useActiveServer } from '~/components/activeServer'
import { Icon, Text } from '~/components/ui'

const fragment = graphql(`
	fragment DiscussionListItem on BookClubDiscussion {
		id
		displayName
		emoji
		messageCount
		isLocked
		isArchived
	}
`)

type Props = {
	data: FragmentType<typeof fragment>
}

// TODO(book-club): Context menu for management (admins only)
export default function DiscussionListItem({ data }: Props) {
	const discussion = useFragment(fragment, data)

	const { clubId } = useLocalSearchParams<{ clubId: string }>()
	const router = useRouter()
	const {
		activeServer: { id: serverID },
	} = useActiveServer()

	return (
		<Pressable
			onPress={() => router.push(`/server/${serverID}/clubs/${clubId}/discussion/${discussion.id}`)}
			className="flex-row items-center justify-between p-3"
		>
			<View className="flex flex-1 flex-row items-center gap-2">
				<View className="squircle flex h-8 w-8 items-center justify-center rounded-xl bg-white/75 dark:bg-black/40">
					{discussion.emoji ? (
						<Text className="text-base">{discussion.emoji}</Text>
					) : (
						<Icon as={Hash} className="h-5 w-5 text-foreground-muted" />
					)}
				</View>
				<Text className="flex-1 font-medium" numberOfLines={1}>
					{discussion.displayName}
				</Text>
			</View>

			<View className="flex-row items-center gap-4 opacity-70">
				{discussion.isLocked && <View>{LockIcon}</View>}
				{discussion.isArchived && <View>{ArchiveIcon}</View>}

				<View className="flex-row items-center gap-1">
					{MessageIcon}
					<Text className="text-sm text-foreground">{discussion.messageCount}</Text>
				</View>
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

const LockIcon = Platform.select({
	ios: (
		<Host matchContents>
			<Image systemName="lock" size={14} />
		</Host>
	),
	android: <Icon as={Lock} className="shadow" size={14} />,
})

const ArchiveIcon = Platform.select({
	ios: (
		<Host matchContents>
			<Image systemName="archivebox" size={14} />
		</Host>
	),
	android: <Icon as={Archive} className="shadow" size={14} />,
})
