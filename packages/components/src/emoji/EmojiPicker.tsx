import Picker from '@emoji-mart/react'
import React, { useEffect, useState } from 'react'

import { IconButton } from '../button'
import { Popover } from '../popover'

type Props = {
	value?: string
	placeholder?: string | React.ReactNode
	trigger?: React.ReactNode
	onEmojiSelect: (emoji: { id: string; name: string; native: string; unified: string }) => void
	onLoadError?: (error: Error) => void
} & Pick<React.ComponentProps<typeof Popover.Content>, 'align'>
export default function EmojiPicker({
	value,
	placeholder,
	onEmojiSelect,
	onLoadError,
	...contentProps
}: Props) {
	const [data, setData] = useState<unknown>()

	useEffect(() => {
		async function getEmojis() {
			try {
				const response = await fetch('https://cdn.jsdelivr.net/npm/@emoji-mart/data')
				setData(await response.json())
			} catch (error) {
				if (error instanceof Error) {
					onLoadError?.(error)
				} else {
					console.error(error)
					onLoadError?.(new Error('Failed to load emojis'))
				}
			}
		}

		if (!data) {
			getEmojis()
		}
	}, [onLoadError, data])

	const renderTrigger = () => {
		const content = value ?? placeholder ?? '😀'

		return (
			<IconButton className="h-6 w-6 text-sm" variant="ghost">
				{content}
			</IconButton>
		)
	}

	return (
		<Popover>
			<Popover.Trigger asChild>{renderTrigger()}</Popover.Trigger>
			<Popover.Content className="!border-none !bg-transparent p-0 !shadow-none" {...contentProps}>
				<Picker data={data} onEmojiSelect={onEmojiSelect} />
			</Popover.Content>
		</Popover>
	)
}
