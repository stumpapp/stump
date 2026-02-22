import { useSDK } from '@stump/client'
import { AggregatedReaction } from '@stump/graphql'
import { differenceInCalendarDays, intlFormat } from 'date-fns'
import { MessageSquare, Pin } from 'lucide-react-native'
import { memo } from 'react'
import { Image, Pressable, View } from 'react-native'

import type { EmojiSelection } from '~/components/emoji/types'
import { Avatar, AvatarFallback, AvatarImage, Icon, Text } from '~/components/ui'
import { useColors } from '~/lib/constants'
import { cn } from '~/lib/utils'

import MessageReplyPreview from './MessageReplyPreview'
import { getSenderInitials } from './utils'

type MessageMember = {
	id: string
	displayName?: string | null
	avatarUrl?: string | null
	username: string
}

type ReplyToInfo = {
	id: string
	content: string
	member?: {
		displayName?: string | null
		username?: string | null
		avatarUrl?: string | null
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
	onToggleReaction?: (messageId: string, selection: EmojiSelection) => void
}

function formatTimestamp(timestamp: string): string {
	const date = new Date(timestamp)
	const now = new Date()
	const daysDiff = differenceInCalendarDays(now, date)

	if (daysDiff === 0) {
		return intlFormat(date, { hour: 'numeric', minute: 'numeric' })
	} else if (daysDiff < 7) {
		return intlFormat(date, { weekday: 'short', hour: 'numeric', minute: 'numeric' })
	} else {
		return intlFormat(date, { month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric' })
	}
}

function Message({
	message,
	isThreadHeader,
	onLongPress,
	onThreadPress,
	onToggleReaction,
}: MessageProps) {
	const { sdk } = useSDK()

	const isDeleted = !!message.deletedAt
	const displayName = message.member?.displayName || message.member?.username || 'Unknown'
	const threadChildrenCount = message.threadChildrenCount ?? 0
	const reactions = message.reactions ?? []
	const showReplyPreview = !!message.replyTo && !isThreadHeader

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
			className={cn({
				'pt-0.5': showReplyPreview, // extra looks better to my eyes with replies above
				'pb-0.5': threadChildrenCount > 0 && !isThreadHeader,
			})}
		>
			{showReplyPreview && <MessageReplyPreview replyTo={message.replyTo} />}

			<View
				className={cn('flex-row gap-3 px-4 py-2', {
					'py-0 pb-2': showReplyPreview,
				})}
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
							{getSenderInitials(message.member)}
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

					<Text>{message.content}</Text>

					<View className="mt-1 flex-row flex-wrap items-center gap-1.5">
						{reactions.map((reaction) => {
							const key = reaction.emoji ?? `custom:${reaction.customEmojiId}`

							const onPress = () => {
								if (reaction.customEmojiId != null) {
									onToggleReaction?.(message.id, {
										kind: 'custom',
										emojiId: reaction.customEmojiId,
									})
									return
								}

								if (reaction.emoji) {
									onToggleReaction?.(message.id, {
										kind: 'unicode',
										emoji: reaction.emoji,
									})
								}
							}

							return (
								<Pressable
									key={key}
									className={cn(
										'flex-row items-center gap-1.5 rounded-full border px-2 py-1.5',
										!reaction.reactedByMe && 'border-edge bg-background-surface',
									)}
									onPress={onPress}
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
									{reaction.customEmojiUrl ? (
										<Image
											source={{
												uri: reaction.customEmojiUrl || '',
												headers: {
													Authorization: sdk.authorizationHeader || '',
												},
											}}
											style={{ width: 20, height: 20 }}
											resizeMode="contain"
										/>
									) : (
										<Text>{reaction.emoji}</Text>
									)}

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
		</View>
	)

	if (onLongPress && !isDeleted) {
		return <Pressable onLongPress={() => onLongPress(message)}>{content}</Pressable>
	}

	return content
}

export default memo(Message)
