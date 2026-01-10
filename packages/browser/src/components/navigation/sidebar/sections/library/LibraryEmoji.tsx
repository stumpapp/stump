import { useGraphQLMutation } from '@stump/client'
import { EmojiPicker } from '@stump/components'
import { graphql, LibrarySideBarSectionQuery } from '@stump/graphql'
import { useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'

const mutation = graphql(`
	mutation UpdateLibraryEmoji($id: ID!, $emoji: String) {
		updateLibraryEmoji(id: $id, emoji: $emoji) {
			id
		}
	}
`)

type Props = {
	emoji?: string
	placeholder?: string | React.ReactNode
	library: LibrarySideBarSectionQuery['libraries']['nodes'][number]
	disabled?: boolean
}

export default function LibraryEmoji({ emoji, placeholder, library, disabled }: Props) {
	const client = useQueryClient()

	const { mutate: updateEmoji } = useGraphQLMutation(mutation, {
		onSuccess: () => client.invalidateQueries({ queryKey: ['libraries'] }),
	})

	const handleEmojiSelect = useCallback(
		(emoji?: { native: string }) => {
			if (!disabled) {
				updateEmoji({ id: library.id, emoji: emoji?.native })
			}
		},
		[updateEmoji, disabled, library.id],
	)

	if (disabled) {
		return (
			<span className="mr-2 flex h-4 w-4 shrink-0 items-center justify-center">
				{emoji ?? placeholder}
			</span>
		)
	}

	return (
		<EmojiPicker
			value={emoji}
			placeholder={placeholder}
			onEmojiSelect={handleEmojiSelect}
			triggerProps={{ className: 'mr-2 flex h-4 w-4 shrink-0 items-center justify-center' }}
			align="start"
		/>
	)
}
