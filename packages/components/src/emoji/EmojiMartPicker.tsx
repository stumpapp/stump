import Picker from '@emoji-mart/react'

type Emoji = {
	id: string
	name: string
	native: string
	unified: string
}

type Props = {
	data: unknown
	onEmojiSelect: (emoji: Emoji) => void
}

export default function EmojiMartPicker({ data, onEmojiSelect }: Props) {
	return <Picker data={data} onEmojiSelect={onEmojiSelect} />
}
