import { useGraphQLMutation, useSuspenseGraphQL } from '@stump/client'
import { graphql } from '@stump/graphql'
import { useLocalSearchParams, useNavigation } from 'expo-router'
import { useLayoutEffect } from 'react'

import { Text } from '~/components/ui'

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
	query BookClubDiscussionMessages($discussionId: ID!, $limit: Int, $after: String) {
		bookClubDiscussionMessages(
			discussionId: $discussionId
			pagination: { limit: $limit, after: $after }
		) {
			nodes {
				id
				content
				timestamp
				parentMessageId
				member {
					id
					displayName
					avatarUrl
					username
				}
			}
			cursorInfo {
				nextCursor
			}
		}
	}
`)

const sendMessageMutation = graphql(`
	mutation SendDiscussionMessage($discussionId: ID!, $content: String!, $parentMessageId: String) {
		sendMessage(
			discussionId: $discussionId
			input: { content: $content, parentMessageId: $parentMessageId }
		) {
			id
		}
	}
`)

export default function Screen() {
	const { roomId } = useLocalSearchParams<{ roomId: string }>()

	const { data: discussionData } = useSuspenseGraphQL(
		discussionQuery,
		['bookClubDiscussion', roomId],
		{ id: roomId },
	)

	const discussion = discussionData.bookClubDiscussion

	const { data: messagesData } = useSuspenseGraphQL(
		messagesQuery,
		['bookClubDiscussionMessages', discussion?.id],
		{
			discussionId: discussion?.id || '',
			limit: 50,
		},
	)

	const { mutateAsync: sendMessage, isPending: isSending } = useGraphQLMutation(sendMessageMutation)

	const messages = messagesData?.bookClubDiscussionMessages.nodes || []
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

	return <Text>TODO: Implement me</Text>
}
