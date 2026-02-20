import { FlashList } from '@shopify/flash-list'
import { useCallback, useRef, useState } from 'react'
import { View } from 'react-native'

import type { EmojiSelection } from '~/components/emoji/types'

import Message, { type MessageData } from './Message'
import { MessageActionSheet, type MessageActionSheetRef } from './MessageActionSheet'
import MessageComposer from './MessageComposer'

type DiscussionRoomProps = {
	name: string
	messages: MessageData[]
	onSend: (content: string, replyToMessageId?: string) => void
	isSending?: boolean
	onToggleReaction: (messageId: string, selection: EmojiSelection) => void
	onDelete: (messageId: string) => void
	// Note: If on thread screen this should not be provided
	onThreadPress?: (message: MessageData) => void
	onLoadMore?: () => void
	isLocked?: boolean
	listHeader?: React.ReactElement
	parentMessageId?: string
}

export default function DiscussionRoom({
	name,
	messages,
	onSend,
	isSending,
	onToggleReaction,
	onDelete,
	onThreadPress,
	onLoadMore,
	isLocked,
	listHeader,
	parentMessageId,
}: DiscussionRoomProps) {
	const actionSheetRef = useRef<MessageActionSheetRef>(null)

	const [replyingTo, setReplyingTo] = useState<MessageData | null>(null)

	const handleMessageLongPress = useCallback(
		(message: MessageData) => actionSheetRef.current?.open(message),
		[],
	)

	const handleReply = (message: MessageData) => setReplyingTo(message)

	const handleSend = (content: string) => {
		onSend(content, replyingTo?.id)
		setReplyingTo(null)
	}

	const onStartReached = () => onLoadMore?.()

	const renderItem = useCallback(
		({ item }: { item: MessageData }) => (
			<Message
				message={item}
				onLongPress={handleMessageLongPress}
				onThreadPress={onThreadPress}
				onToggleReaction={onToggleReaction}
			/>
		),
		[handleMessageLongPress, onThreadPress, onToggleReaction],
	)

	return (
		<>
			<FlashList
				data={messages}
				renderItem={renderItem}
				keyExtractor={(item) => item.id}
				maintainVisibleContentPosition={{
					autoscrollToBottomThreshold: 0.2,
					startRenderingFromBottom: true,
				}}
				onStartReached={onStartReached}
				onStartReachedThreshold={0.5}
				drawDistance={250}
				contentContainerStyle={{ paddingVertical: 8 }}
				ItemSeparatorComponent={() => <View className="h-0.5" />}
				ListHeaderComponent={listHeader}
			/>

			<MessageComposer
				onSend={handleSend}
				isSending={isSending}
				isLocked={isLocked}
				placeholder={`Message #${name}...`}
				parentMessageId={parentMessageId}
				replyingTo={replyingTo}
				onCancelReply={() => setReplyingTo(null)}
			/>
			<MessageActionSheet
				ref={actionSheetRef}
				onReply={handleReply}
				onThreadPress={onThreadPress}
				onToggleReaction={onToggleReaction}
				onDelete={onDelete}
			/>
		</>
	)
}
