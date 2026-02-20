import { TrueSheet } from '@lodev09/react-native-true-sheet'
import { FlashList } from '@shopify/flash-list'
import { forwardRef, useImperativeHandle, useMemo, useRef } from 'react'
import { Pressable, View } from 'react-native'
import TImage from 'react-native-turbo-image'

import { IS_IOS_24_PLUS, useColors } from '~/lib/constants'
import { useDisplay } from '~/lib/hooks'

import { SheetHeader, Text } from '../ui'
import type { Emoji, EmojiSelection } from './types'
import { useEmojis } from './useEmojis'

export type EmojiPickerSheetRef = {
	present: () => void
	dismiss: () => void
}

type Props = {
	onEmojiSelect: (selection: EmojiSelection) => void
}

const COLUMNS = 8

// Note: These are just from that JSON file I yoinked
const CATEGORY_ORDER = [
	'smileys & emotion',
	'people & body',
	'animals & nature',
	'food & drink',
	'travel & places',
	'activities',
	'objects',
	'symbols',
	'flags',
] as const

// TODO(localization): Add translation strings instead
const LABELS: Record<(typeof CATEGORY_ORDER)[number], string> = {
	'smileys & emotion': 'Smileys & Emotion',
	'people & body': 'People & Body',
	'animals & nature': 'Animals & Nature',
	'food & drink': 'Food & Drink',
	'travel & places': 'Travel & Places',
	activities: 'Activities',
	objects: 'Objects',
	symbols: 'Symbols',
	flags: 'Flags',
}

type EmojiSection = {
	title: string
	emojis: Emoji[]
}

type ListItem =
	| {
			type: 'header'
			key: string
			title: string
	  }
	| {
			type: 'row'
			key: string
			title: string
			emojis: Emoji[]
	  }

export const EmojiPickerSheet = forwardRef<EmojiPickerSheetRef, Props>(({ onEmojiSelect }, ref) => {
	const sheetRef = useRef<TrueSheet>(null)
	const colors = useColors()
	const emojisByCategory = useEmojis()

	const { width } = useDisplay()

	useImperativeHandle(ref, () => ({
		present: () => {
			sheetRef.current?.present()
		},
		dismiss: () => {
			sheetRef.current?.dismiss()
		},
	}))

	const itemSize = useMemo(() => {
		if (!width) return 32

		// width - hpadding - gaps, per row
		const availableWidth = width - 16 * 2 - 6 * (COLUMNS - 1)
		return Math.max(28, availableWidth / COLUMNS)
	}, [width])

	const sections = useMemo<EmojiSection[]>(() => {
		const nextSections: EmojiSection[] = []

		const serverEmojis = emojisByCategory.Server ?? []
		if (serverEmojis.length) {
			nextSections.push({
				title: 'Server',
				emojis: serverEmojis,
			})
		}

		const knownCategorySet = new Set(CATEGORY_ORDER)
		const categoryOrder = [
			...CATEGORY_ORDER,
			...Object.keys(emojisByCategory).filter(
				(category) =>
					category !== 'Server' &&
					!knownCategorySet.has(category as (typeof CATEGORY_ORDER)[number]),
			),
		]

		for (const category of categoryOrder) {
			const categoryEmojis = emojisByCategory[category]
			if (!categoryEmojis?.length) continue

			nextSections.push({
				title: category,
				emojis: categoryEmojis,
			})
		}

		return nextSections
	}, [emojisByCategory])

	const listData = useMemo<ListItem[]>(() => {
		const items: ListItem[] = []

		for (const section of sections) {
			items.push({
				type: 'header',
				key: `header:${section.title}`,
				title: section.title,
			})

			for (let i = 0; i < section.emojis.length; i += COLUMNS) {
				items.push({
					type: 'row',
					key: `row:${section.title}:${i}`,
					title: section.title,
					emojis: section.emojis.slice(i, i + COLUMNS),
				})
			}
		}

		return items
	}, [sections])

	const handleEmojiPress = (selection: EmojiSelection) => {
		sheetRef.current?.dismiss()
		onEmojiSelect(selection)
	}

	const renderEmoji = (emoji: Emoji, index: number, rowLength: number) => {
		const isUnicodeEmoji = 'emoji' in emoji
		// 4px inner padding on each side
		const glyphSize = Math.max(18, Math.floor(itemSize - 4 * 2))

		const handlePress = () => {
			if (isUnicodeEmoji) {
				handleEmojiPress({ kind: 'unicode', emoji: emoji.emoji })
			} else {
				const parsedId = Number(emoji.id)
				if (!Number.isFinite(parsedId)) return

				handleEmojiPress({ kind: 'custom', emojiId: parsedId })
			}
		}

		return (
			<Pressable
				key={isUnicodeEmoji ? emoji.unified : `custom:${emoji.id}`}
				onPress={handlePress}
				className="items-center justify-center rounded-xl"
				style={{
					width: itemSize,
					height: itemSize,
					marginRight: index < rowLength - 1 ? 6 : 0,
				}}
			>
				{isUnicodeEmoji ? (
					<View
						className="items-center justify-center"
						style={{ width: itemSize, height: itemSize }}
					>
						<Text
							style={{
								fontSize: glyphSize,
								lineHeight: glyphSize + 2,
								textAlign: 'center',
							}}
						>
							{emoji.emoji}
						</Text>
					</View>
				) : (
					<View
						className="items-center justify-center"
						style={{ width: itemSize, height: itemSize }}
					>
						<TImage
							source={{ uri: emoji.url }}
							style={{ width: glyphSize, height: glyphSize }}
							resizeMode="contain"
						/>
					</View>
				)}
			</Pressable>
		)
	}

	return (
		<TrueSheet
			ref={sheetRef}
			detents={[1]}
			cornerRadius={24}
			grabber
			backgroundColor={IS_IOS_24_PLUS ? undefined : colors.sheet.background}
			grabberOptions={{ color: colors.sheet.grabber }}
			header={<SheetHeader title="Emojis" onClose={() => sheetRef.current?.dismiss()} />}
			scrollable
		>
			<FlashList
				data={listData}
				keyExtractor={(item) => item.key}
				renderItem={({ item }) => {
					if (item.type === 'header') {
						return (
							<View className="px-4 pb-1 pt-3">
								<Text className="font-semibold text-foreground-muted">
									{LABELS[item.title as keyof typeof LABELS]}
								</Text>
							</View>
						)
					}

					return (
						<View className="flex-row px-4 py-0.5">
							{item.emojis.map((emoji, index) => renderEmoji(emoji, index, item.emojis.length))}
						</View>
					)
				}}
			/>
		</TrueSheet>
	)
})

EmojiPickerSheet.displayName = 'EmojiPickerSheet'
