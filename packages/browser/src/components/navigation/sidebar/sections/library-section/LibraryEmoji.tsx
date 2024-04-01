import { useEditLibraryMutation } from '@stump/client'
import { EmojiPicker } from '@stump/components'
import { Library } from '@stump/types'
import React from 'react'

type Props = {
	emoji?: string
	placeholder?: string | React.ReactNode
	library: Library
	disabled?: boolean
}
export default function LibraryEmoji({ emoji, placeholder, library, disabled }: Props) {
	const { editLibraryAsync } = useEditLibraryMutation()

	const handleEmojiSelect = (emoji?: { native: string }) => {
		if (disabled) {
			return
		}

		editLibraryAsync({
			...library,
			emoji: emoji?.native ?? null,
			scan_mode: 'NONE',
		})
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
			onEmojiSelect={handleEmojiSelect}
			triggerProps={{ className: 'mr-2 flex h-4 w-4 shrink-0 items-center justify-center' }}
			align="start"
		/>
	)
}
