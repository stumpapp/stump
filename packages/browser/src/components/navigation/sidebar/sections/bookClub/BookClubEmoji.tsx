import { EmojiPicker } from '@stump/components'

type Props = {
	emoji?: string
	placeholder?: string | React.ReactNode
	bookClub: unknown
	disabled?: boolean
}

// TODO(book-club): Implement

export default function BookClubEmoji({ emoji, placeholder, disabled }: Props) {
	// const { updateBookClub } = useUpdateBookClub({ id: bookClub.id })
	// TODO(graphql): Fix

	const handleEmojiSelect = async () => {
		if (disabled) {
			return
		}

		// try {
		// 	await updateBookClub({
		// 		...bookClub,
		// 		emoji: emoji?.native ?? null,
		// 	})
		// } catch (error) {
		// 	if (error instanceof Error) {
		// 		toast.error(error.message)
		// 	} else {
		// 		console.error(error)
		// 		toast.error('Failed to update book club')
		// 	}
		// }
	}

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
			disabled={disabled}
			onEmojiSelect={handleEmojiSelect}
			triggerProps={{ className: 'mr-2 flex h-4 w-4 shrink-0 items-center justify-center' }}
			align="start"
		/>
	)
}
