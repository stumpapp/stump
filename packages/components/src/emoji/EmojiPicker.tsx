import Picker from '@emoji-mart/react'
import React, { useEffect, useState } from 'react'

import { IconButton } from '../button'
import { Dropdown } from '../dropdown'
import { Popover } from '../popover'
import { cn } from '../utils'

// TODO: this should probably be moved to the browser package so I can
// use react-query for better caching AND language support

type Emoji = {
	id: string
	name: string
	native: string
	unified: string
}
type Props = {
	value?: string
	disabled?: boolean
	placeholder?: string | React.ReactNode
	triggerProps?: React.ComponentProps<typeof IconButton>
	onEmojiSelect: (emoji?: Emoji) => void
	onLoadError?: (error: Error) => void
} & Pick<React.ComponentProps<typeof Popover.Content>, 'align'>
export default function EmojiPicker({
	value,
	disabled,
	placeholder,
	onEmojiSelect,
	onLoadError,
	triggerProps,
	...contentProps
}: Props) {
	const [isOpen, setIsOpen] = useState(false)
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

	const handleEmojiSelect = (emoji: Emoji) => {
		onEmojiSelect(emoji)
		setIsOpen(false)
	}

	const renderTrigger = () => {
		const content = value ?? placeholder ?? '😀'

		const { className, ...rest } = triggerProps ?? {}
		return (
			<IconButton
				type="button"
				className={cn('h-6 w-6 text-sm', className)}
				variant="ghost"
				{...rest}
				disabled={disabled}
			>
				{content}
			</IconButton>
		)
	}

	return (
		<div>
			{!isOpen && (
				<Dropdown>
					<Dropdown.Trigger asChild disabled={disabled}>
						{renderTrigger()}
					</Dropdown.Trigger>
					<Dropdown.Content align="start">
						<Dropdown.Label className="text-xs">Emoji options</Dropdown.Label>
						<Dropdown.Item disabled={disabled} onClick={() => setIsOpen(true)}>
							Change
						</Dropdown.Item>
						<Dropdown.Item disabled={disabled || !value} onClick={() => onEmojiSelect(undefined)}>
							Remove
						</Dropdown.Item>
					</Dropdown.Content>
				</Dropdown>
			)}

			{isOpen && (
				<Popover open={isOpen} onOpenChange={setIsOpen}>
					<Popover.Trigger asChild disabled={disabled}>
						{renderTrigger()}
					</Popover.Trigger>
					<Popover.Content
						className="!border-none !bg-transparent p-0 !shadow-none"
						{...contentProps}
					>
						<Picker data={data} onEmojiSelect={handleEmojiSelect} />
					</Popover.Content>
				</Popover>
			)}
		</div>
	)
}
