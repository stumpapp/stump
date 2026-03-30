import { View } from 'react-native'

import { Avatar, AvatarFallback, AvatarImage, Text } from '~/components/ui'

import { getSenderInitials } from './utils'

type ReplyPreviewMember = {
	displayName?: string | null
	username?: string | null
	avatarUrl?: string | null
} | null

type ReplyPreviewInfo = {
	content: string
	member?: ReplyPreviewMember
} | null

type Props = {
	replyTo?: ReplyPreviewInfo
}

export default function MessageReplyPreview({ replyTo }: Props) {
	if (!replyTo) return null

	const replyName = replyTo.member?.displayName || replyTo.member?.username || 'Unknown'

	// Note: Copying this border from discord was a LOT of pixel peeping, I'm sure there is a better way
	return (
		<View className="flex-row px-4 pb-0.5 pt-1.5">
			{/* 16px row pad + 16px avatar center - 2px stroke + 4px extra for spacing and line shenanigans */}
			<View className="h-6 pl-[34px]" />
			<View className="flex-1">
				<View className="relative flex-row items-center gap-1.5">
					<View
						pointerEvents="none"
						className="absolute -left-6 top-2 h-4 w-6 rounded-tl-lg border-l border-t border-edge"
					/>

					<Avatar className="ml-1 h-4 w-4" alt={replyName}>
						{replyTo.member?.avatarUrl && (
							<AvatarImage
								source={{
									uri: replyTo.member.avatarUrl,
								}}
							/>
						)}
						<AvatarFallback>
							<Text className="text-[9px] font-medium">{getSenderInitials(replyTo.member)}</Text>
						</AvatarFallback>
					</Avatar>

					<Text size="xs" className="font-medium text-foreground-muted" numberOfLines={1}>
						{replyName}
					</Text>
					<Text size="xs" className="flex-1 text-foreground-muted" numberOfLines={1}>
						{replyTo.content}
					</Text>
				</View>
			</View>
		</View>
	)
}
