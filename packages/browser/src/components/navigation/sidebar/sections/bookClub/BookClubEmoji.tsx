import { useUpdateBookClub } from '@stump/client'
import { EmojiPicker } from '@stump/components'
import { BookClub } from '@stump/sdk'
import React from 'react'
import toast from 'react-hot-toast'

type Props = {
	emoji?: string
	placeholder?: string | React.ReactNode
	bookClub: BookClub
	disabled?: boolean
}
export default function BookClubEmoji({ emoji, placeholder, bookClub, disabled }: Props) {
	const { updateBookClub } = useUpdateBookClub({ id: bookClub.id })

	const handleEmojiSelect = async (emoji?: { native: string }) => {
		if (disabled) {
			return
		}

		try {
			await updateBookClub({
				...bookClub,
				emoji: emoji?.native ?? null,
			})
		} catch (error) {
			if (error instanceof Error) {
				toast.error(error.message)
			} else {
				console.error(error)
				toast.error('Failed to update book club')
			}
		}
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
