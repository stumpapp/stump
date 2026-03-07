import { UseEmojisQuery } from '@stump/graphql'

export type JsonEmoji = {
	category: string
	keywords: string[]
	name: string
	order: number
	unified: string
	emoji: string
}

export type CustomEmoji = NonNullable<UseEmojisQuery['customEmojis']>[number]

export type Emoji = JsonEmoji | (CustomEmoji & { category: 'Server'; keywords: string[] })

export type EmojiSelection =
	| {
			kind: 'unicode'
			emoji: string
	  }
	| {
			kind: 'custom'
			emojiId: number
	  }
