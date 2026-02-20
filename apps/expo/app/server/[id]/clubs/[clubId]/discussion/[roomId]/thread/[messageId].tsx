import { useGraphQLMutation, useInfiniteCursorGraphQL, useSuspenseGraphQL } from '@stump/client'
import { graphql } from '@stump/graphql'
import { useQueryClient } from '@tanstack/react-query'
import { useLocalSearchParams, useNavigation } from 'expo-router'
import { useCallback, useLayoutEffect, useMemo } from 'react'
import { Platform, View } from 'react-native'
import { KeyboardAvoidingView } from 'react-native-keyboard-controller'

import { useBookClubContext } from '~/components/bookClub/context'
import { DiscussionRoom, Message, type MessageData } from '~/components/bookClub/discussion'
import type { EmojiSelection } from '~/components/emoji/types'

const parentMessageQuery = graphql(`
	query ThreadParentMessage($id: ID!) {
		bookClubDiscussionMessage(id: $id) {
			id
			content
			timestamp
			editedAt
			deletedAt
			isPinnedMessage
			parentMessageId
			memberId
			threadChildrenCount
			reactions {
				emoji
				customEmojiId
				customEmojiUrl
				count
				reactedByMe
			}
			replyTo {
				id
				content
				member {
					displayName
					username
					avatarUrl
				}
			}
			member {
				id
				displayName
				avatarUrl
				username
			}
		}
	}
`)

const threadRepliesQuery = graphql(`
	query ThreadReplies($discussionId: ID!, $parentId: ID, $pagination: CursorPagination) {
		bookClubDiscussionMessages(
			discussionId: $discussionId
			parentId: $parentId
			pagination: $pagination
		) {
			nodes {
				id
				content
				timestamp
				editedAt
				deletedAt
				isPinnedMessage
				parentMessageId
				memberId
				threadChildrenCount
				reactions {
					emoji
					customEmojiId
					count
					reactedByMe
				}
				replyTo {
					id
					content
					member {
						displayName
						username
					}
				}
				member {
					id
					displayName
					avatarUrl
					username
				}
			}
			cursorInfo {
				nextCursor
				limit
			}
		}
	}
`)

const sendMessageMutation = graphql(`
	mutation SendThreadReply($discussionId: ID!, $input: SendMessageInput!) {
		sendMessage(discussionId: $discussionId, input: $input) {
			id
		}
	}
`)

const toggleReactionMutation = graphql(`
	mutation ToggleThreadMessageReaction($messageId: ID!, $emoji: String, $customEmojiId: Int) {
		toggleReaction(messageId: $messageId, emoji: $emoji, customEmojiId: $customEmojiId)
	}
`)

const deleteMessageMutation = graphql(`
	mutation DeleteThreadMessage($messageId: ID!) {
		deleteMessage(messageId: $messageId) {
			id
		}
	}
`)

const discussionQuery = graphql(`
	query ThreadDiscussionInfo($id: ID!) {
		bookClubDiscussion(id: $id) {
			id
			displayName
			isLocked
		}
	}
`)

export default function ThreadScreen() {
	const { roomId, messageId } = useLocalSearchParams<{
		roomId: string
		messageId: string
	}>()
	const queryClient = useQueryClient()
	const navigation = useNavigation()

	const { viewerMembership } = useBookClubContext()
	const currentMemberId = viewerMembership?.id

	const repliesQueryKey = useMemo(() => ['threadReplies', roomId, messageId], [roomId, messageId])

	const { data: discussionData } = useSuspenseGraphQL(
		discussionQuery,
		['threadDiscussion', roomId],
		{ id: roomId },
	)

	const discussion = discussionData.bookClubDiscussion
	const isLocked = discussion?.isLocked ?? false

	useLayoutEffect(() => {
		navigation.setOptions({
			headerShown: true,
			title: 'Thread',
		})
	}, [navigation])

	const { data: parentData } = useSuspenseGraphQL(
		parentMessageQuery,
		['threadParentMessage', messageId],
		{ id: messageId },
	)

	const parentMessage = parentData?.bookClubDiscussionMessage as MessageData | undefined

	const {
		data: repliesData,
		fetchNextPage,
		hasNextPage,
		isFetchingNextPage,
	} = useInfiniteCursorGraphQL(threadRepliesQuery, repliesQueryKey, {
		discussionId: roomId,
		parentId: messageId,
		pagination: { limit: 30 },
	})

	const replies = useMemo<MessageData[]>(
		() =>
			[
				...(repliesData?.pages.flatMap(
					(page) => page.bookClubDiscussionMessages.nodes as MessageData[],
				) ?? []),
			].reverse(),
		[repliesData],
	)

	const { mutateAsync: sendReply, isPending: isSending } = useGraphQLMutation(sendMessageMutation)

	const { mutateAsync: toggleReaction } = useGraphQLMutation(toggleReactionMutation)
	const { mutateAsync: deleteMessage } = useGraphQLMutation(deleteMessageMutation)

	const handleSend = async (content: string, replyToMessageId?: string) => {
		await sendReply({
			discussionId: roomId,
			input: {
				content,
				replyToMessageId,
				parentMessageId: messageId,
			},
		})
		queryClient.invalidateQueries({ queryKey: repliesQueryKey })
		queryClient.invalidateQueries({ queryKey: ['bookClubDiscussionMessages', roomId] })
	}

	const handleToggleReaction = useCallback(
		async (msgId: string, selection: EmojiSelection) => {
			if (selection.kind === 'unicode') {
				await toggleReaction({ messageId: msgId, emoji: selection.emoji, customEmojiId: null })
			} else {
				await toggleReaction({ messageId: msgId, emoji: null, customEmojiId: selection.emojiId })
			}

			queryClient.invalidateQueries({ queryKey: repliesQueryKey })
		},
		[toggleReaction, queryClient, repliesQueryKey],
	)

	const handleDelete = async (msgId: string) => {
		await deleteMessage({ messageId: msgId })
		queryClient.invalidateQueries({ queryKey: repliesQueryKey })
	}

	const handleLoadMore = () => {
		if (hasNextPage && !isFetchingNextPage) {
			fetchNextPage()
		}
	}

	const threadHeader = useMemo(() => {
		if (!parentMessage) return undefined
		return (
			<View className="border-b border-edge">
				<Message
					message={parentMessage}
					currentMemberId={currentMemberId}
					onToggleReaction={handleToggleReaction}
					isThreadHeader
				/>
			</View>
		)
	}, [parentMessage, currentMemberId, handleToggleReaction])

	return (
		<KeyboardAvoidingView
			behavior="padding"
			className="flex-1 bg-background"
			// TODO: I got to 120 after trial and error but need to sort iit out properl
			keyboardVerticalOffset={Platform.OS === 'ios' ? 120 : 0}
		>
			<DiscussionRoom
				// TODO: I'd rather display a name for the thread
				name={discussion.displayName}
				messages={replies}
				onSend={handleSend}
				isSending={isSending}
				onToggleReaction={handleToggleReaction}
				onDelete={handleDelete}
				onLoadMore={handleLoadMore}
				isLocked={isLocked}
				parentMessageId={messageId}
				listHeader={threadHeader}
			/>
		</KeyboardAvoidingView>
	)
}
