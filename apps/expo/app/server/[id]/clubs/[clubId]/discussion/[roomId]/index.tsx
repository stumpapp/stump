import { useGraphQLMutation, useInfiniteCursorGraphQL, useSuspenseGraphQL } from '@stump/client'
import { graphql } from '@stump/graphql'
import { useQueryClient } from '@tanstack/react-query'
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router'
import { useLayoutEffect, useMemo } from 'react'
import { Platform } from 'react-native'
import { KeyboardAvoidingView } from 'react-native-keyboard-controller'

import { useActiveServer } from '~/components/activeServer'
import type { MessageData } from '~/components/bookClub/discussion'
import { DiscussionRoom } from '~/components/bookClub/discussion'
import type { EmojiSelection } from '~/components/emoji/types'

const discussionQuery = graphql(`
	query BookClubDiscussionRoom($id: ID!) {
		bookClubDiscussion(id: $id) {
			id
			displayName
			isLocked
			book {
				id
				title
				author
			}
		}
	}
`)

const messagesQuery = graphql(`
	query BookClubDiscussionMessages($discussionId: ID!, $pagination: CursorPagination) {
		bookClubDiscussionMessages(discussionId: $discussionId, pagination: $pagination) {
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
			cursorInfo {
				nextCursor
				limit
			}
		}
	}
`)

const sendMessageMutation = graphql(`
	mutation SendDiscussionMessage($discussionId: ID!, $input: SendMessageInput!) {
		sendMessage(discussionId: $discussionId, input: $input) {
			id
		}
	}
`)

const toggleReactionMutation = graphql(`
	mutation ToggleMessageReaction($messageId: ID!, $emoji: String, $customEmojiId: Int) {
		toggleReaction(messageId: $messageId, emoji: $emoji, customEmojiId: $customEmojiId)
	}
`)

const deleteMessageMutation = graphql(`
	mutation DeleteDiscussionMessage($messageId: ID!) {
		deleteMessage(messageId: $messageId) {
			id
		}
	}
`)

export default function Screen() {
	const { roomId, clubId } = useLocalSearchParams<{ roomId: string; clubId: string }>()
	const {
		activeServer: { id: serverID },
	} = useActiveServer()

	const messagesQueryKey = useMemo(() => ['bookClubDiscussionMessages', roomId], [roomId])
	const router = useRouter()
	const queryClient = useQueryClient()

	const { data: discussionData } = useSuspenseGraphQL(
		discussionQuery,
		['bookClubDiscussion', roomId],
		{ id: roomId },
	)

	const discussion = discussionData.bookClubDiscussion

	const {
		data: messagesData,
		fetchNextPage,
		hasNextPage,
		isFetchingNextPage,
	} = useInfiniteCursorGraphQL(messagesQuery, messagesQueryKey, {
		discussionId: discussion?.id || '',
		pagination: { limit: 30 },
	})

	const messages = useMemo<MessageData[]>(
		() =>
			[
				...(messagesData?.pages.flatMap(
					(page) => page.bookClubDiscussionMessages.nodes as MessageData[],
				) ?? []),
			].reverse(),
		[messagesData],
	)

	const { mutateAsync: sendMessage, isPending: isSending } = useGraphQLMutation(sendMessageMutation)
	const { mutateAsync: toggleReaction } = useGraphQLMutation(toggleReactionMutation)
	const { mutateAsync: deleteMessage } = useGraphQLMutation(deleteMessageMutation)

	const isLocked = discussion?.isLocked ?? false
	const roomName = discussion?.displayName

	const navigation = useNavigation()
	useLayoutEffect(() => {
		if (roomName) {
			navigation.setOptions({
				headerShown: true,
				title: roomName,
			})
		}
	}, [navigation, roomName])

	const discussionId = discussion?.id || ''
	const handleSend = async (content: string, replyToMessageId?: string) => {
		if (!discussionId) return
		await sendMessage({
			discussionId,
			input: {
				content,
				parentMessageId: null,
				replyToMessageId: replyToMessageId ?? null,
			},
		})
		queryClient.invalidateQueries({ queryKey: messagesQueryKey })
	}

	const handleToggleReaction = async (messageId: string, selection: EmojiSelection) => {
		if (selection.kind === 'unicode') {
			await toggleReaction({ messageId, emoji: selection.emoji, customEmojiId: null })
		} else {
			await toggleReaction({ messageId, emoji: null, customEmojiId: selection.emojiId })
		}

		queryClient.invalidateQueries({ queryKey: messagesQueryKey })
	}

	const handleDelete = async (messageId: string) => {
		await deleteMessage({ messageId })
		queryClient.invalidateQueries({ queryKey: messagesQueryKey })
	}

	const handleThreadPress = (message: MessageData) =>
		router.push(`/server/${serverID}/clubs/${clubId}/discussion/${roomId}/thread/${message.id}`)

	const handleLoadMore = () => {
		if (hasNextPage && !isFetchingNextPage) {
			fetchNextPage()
		}
	}

	return (
		<KeyboardAvoidingView
			behavior="padding"
			className="flex-1 bg-background"
			// TODO: I got to 120 after trial and error but need to sort iit out properl
			keyboardVerticalOffset={Platform.OS === 'ios' ? 120 : 0}
		>
			<DiscussionRoom
				name={roomName}
				messages={messages}
				onSend={handleSend}
				isSending={isSending}
				onToggleReaction={handleToggleReaction}
				onDelete={handleDelete}
				onThreadPress={handleThreadPress}
				onLoadMore={handleLoadMore}
				isLocked={isLocked}
			/>
		</KeyboardAvoidingView>
	)
}
