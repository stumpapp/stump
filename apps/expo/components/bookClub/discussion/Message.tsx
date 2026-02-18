import dayjs from 'dayjs'
import { CornerDownRight, MessageSquare, Pin } from 'lucide-react-native'
import { memo } from 'react'
import { Pressable, View } from 'react-native'

import { Avatar, AvatarFallback, AvatarImage, Icon, Text } from '~/components/ui'
import { useColors } from '~/lib/constants'
import { cn } from '~/lib/utils'

type MessageMember = {
	id: string
	displayName?: string | null
	avatarUrl?: string | null
	username: string
}

type AggregatedReaction = {
	emoji?: string | null
	customEmojiId?: number | null
	count: number
	reactedByMe: boolean
}

type ReplyToInfo = {
	id: string
	content: string
	member?: {
		displayName?: string | null
		username?: string | null
	} | null
}

export type MessageData = {
	id: string
	content: string
	timestamp: string
	editedAt?: string | null
	deletedAt?: string | null
	parentMessageId?: string | null
	memberId?: string | null
	isPinnedMessage?: boolean
	threadChildrenCount?: number
	reactions?: AggregatedReaction[]
	replyTo?: ReplyToInfo | null
	member?: MessageMember | null
}

type MessageProps = {
	message: MessageData
	currentMemberId?: string
	isThreadHeader?: boolean
	onLongPress?: (message: MessageData) => void
	onThreadPress?: (message: MessageData) => void
	onToggleReaction?: (messageId: string, emoji?: string, customEmojiId?: number) => void
}

function getInitials(member?: MessageMember | null): string {
	const name = member?.displayName || member?.username || '?'
	return name
		.split(' ')
		.map((part) => part[0])
		.join('')
		.toUpperCase()
		.slice(0, 2)
}

function formatTimestamp(timestamp: string): string {
	const date = dayjs(timestamp)
	const now = dayjs()

	// TODO(localization): Refactor once date-fns is merged
	if (now.diff(date, 'day') === 0) {
		return date.format('h:mm A')
	} else if (now.diff(date, 'day') < 7) {
		return date.format('ddd h:mm A')
	} else {
		return date.format('MMM D, h:mm A')
	}
}

function Message({
	message,
	isThreadHeader,
	onLongPress,
	onThreadPress,
	onToggleReaction,
}: MessageProps) {
	const isDeleted = !!message.deletedAt
	const displayName = message.member?.displayName || message.member?.username || 'Unknown'
	const threadChildrenCount = message.threadChildrenCount ?? 0
	const reactions = message.reactions ?? []

	const colors = useColors()

	if (isDeleted) {
		return (
			<View className="flex-row gap-3 px-4 py-2 opacity-50">
				<View className="h-8 w-8" />
				<Text className="flex-1 italic text-foreground-muted" size="sm">
					This message was deleted
				</Text>
			</View>
		)
	}

	const content = (
		<View
			className={cn('flex-row gap-3 px-4 py-2', isThreadHeader ? 'border-l-2' : 'border-none')}
			style={isThreadHeader ? { borderColor: colors.fill.brand.DEFAULT } : undefined}
		>
			<Avatar className="mt-0.5 h-8 w-8" alt={displayName}>
				{message.member?.avatarUrl && (
					<AvatarImage
						source={{
							uri: message.member.avatarUrl,
						}}
					/>
				)}
				<AvatarFallback>
					<Text size="xs" className="font-medium">
						{getInitials(message.member)}
					</Text>
				</AvatarFallback>
			</Avatar>

			<View className="flex-1 gap-0.5">
				<View className="flex-row items-baseline gap-2">
					<Text className="font-semibold">{displayName}</Text>
					<Text size="xs" className="text-foreground-muted">
						{formatTimestamp(message.timestamp)}
					</Text>
					{message.editedAt && (
						<Text size="xs" className="text-foreground-muted">
							(edited)
						</Text>
					)}
					{message.isPinnedMessage && <Icon as={Pin} className="h-3 w-3 text-foreground-muted" />}
				</View>

				{message.replyTo && !isThreadHeader && (
					<View className="mb-0.5 flex-row items-center gap-1.5 rounded border-l-2 border-blue-400 bg-background-surface/50 px-2 py-1">
						<Icon as={CornerDownRight} className="h-3 w-3 text-foreground-muted" />
						<Text size="xs" className="font-medium text-foreground-muted" numberOfLines={1}>
							{message.replyTo.member?.displayName || message.replyTo.member?.username || 'Unknown'}
						</Text>
						<Text size="xs" className="flex-1 text-foreground-muted" numberOfLines={1}>
							{message.replyTo.content}
						</Text>
					</View>
				)}

				<Text>{message.content}</Text>

				<View className="mt-1 flex-row flex-wrap items-center gap-1.5">
					{reactions.map((reaction) => {
						const key = reaction.emoji ?? `custom:${reaction.customEmojiId}`
						const display = reaction.emoji ?? '⭐'
						return (
							<Pressable
								key={key}
								className={cn(
									'flex-row items-center gap-1.5 rounded-full border px-2 py-1.5',
									!reaction.reactedByMe && 'border-edge bg-background-surface',
								)}
								onPress={() =>
									onToggleReaction?.(
										message.id,
										reaction.emoji ?? undefined,
										reaction.customEmojiId ?? undefined,
									)
								}
								style={
									reaction.reactedByMe
										? {
												borderColor: colors.fill.brand.DEFAULT,
												// FIXME: brand.secondary not working?
												backgroundColor: colors.fill.brand.DEFAULT + '20',
											}
										: undefined
								}
							>
								<Text className="text-xs">{display}</Text>
								<Text
									size="xs"
									className={cn(reaction.reactedByMe ? 'font-medium' : 'text-foreground-muted')}
									style={reaction.reactedByMe ? { color: colors.fill.brand.DEFAULT } : undefined}
								>
									{reaction.count}
								</Text>
							</Pressable>
						)
					})}

					{threadChildrenCount > 0 && !isThreadHeader && (
						<Pressable
							className="flex-row items-center gap-1"
							onPress={() => onThreadPress?.(message)}
						>
							<Icon as={MessageSquare} className="h-3.5 w-3.5 text-foreground-muted opacity-90" />
							<Text size="xs" className="font-medium text-foreground-muted opacity-90">
								{threadChildrenCount} {threadChildrenCount === 1 ? 'reply' : 'replies'}
							</Text>
						</Pressable>
					)}
				</View>
			</View>
		</View>
	)

	if (onLongPress && !isDeleted) {
		return <Pressable onLongPress={() => onLongPress(message)}>{content}</Pressable>
	}

	return content
}

export default memo(Message)
