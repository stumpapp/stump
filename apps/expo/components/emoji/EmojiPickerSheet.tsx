import { TrueSheet } from '@lodev09/react-native-true-sheet'
import { FlashList } from '@shopify/flash-list'
import { useSDK } from '@stump/client'
import { forwardRef, useImperativeHandle, useMemo, useRef, useState } from 'react'
import { Image, Pressable, View } from 'react-native'

import { IS_IOS_24_PLUS, useColors } from '~/lib/constants'
import { useDisplay } from '~/lib/hooks'

import { Input, SheetHeader, Text } from '../ui'
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

const normalize = (value: string) => value.trim().toLowerCase()

const fuzzyMatch = (query: string, value: string) => {
	const normalizedQuery = normalize(query)
	if (!normalizedQuery) return true

	const normalizedValue = normalize(value)
	if (!normalizedValue) return false

	return normalizedValue.includes(normalizedQuery)
}

const emojiMatchesQuery = (emoji: Emoji, queryTokens: string[]) => {
	if (!queryTokens.length) return true

	const searchableFields = [emoji.name, ...emoji.keywords]

	return queryTokens.every((token) => searchableFields.some((field) => fuzzyMatch(token, field)))
}

export const EmojiPickerSheet = forwardRef<EmojiPickerSheetRef, Props>(({ onEmojiSelect }, ref) => {
	const sheetRef = useRef<TrueSheet>(null)
	const colors = useColors()
	const emojisByCategory = useEmojis()
	const [searchQuery, setSearchQuery] = useState('')

	const { width } = useDisplay()
	const { sdk } = useSDK()

	const dismissSheet = () => {
		sheetRef.current?.dismiss()
		setSearchQuery('')
	}

	useImperativeHandle(ref, () => ({
		present: () => {
			sheetRef.current?.present()
		},
		dismiss: () => {
			dismissSheet()
		},
	}))

	const queryTokens = useMemo(
		() =>
			searchQuery
				.split(/\s+/)
				.map((token) => token.trim())
				.filter(Boolean),
		[searchQuery],
	)

	const itemSize = useMemo(() => {
		if (!width) return 32

		// width - hpadding - gaps, per row
		const availableWidth = width - 16 * 2 - 6 * (COLUMNS - 1)
		return Math.max(28, availableWidth / COLUMNS)
	}, [width])

	const sections = useMemo<EmojiSection[]>(() => {
		const nextSections: EmojiSection[] = []

		const serverEmojis = (emojisByCategory.Server ?? []).filter((emoji) =>
			emojiMatchesQuery(emoji, queryTokens),
		)
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
			const categoryEmojis = emojisByCategory[category]?.filter((emoji) =>
				emojiMatchesQuery(emoji, queryTokens),
			)
			if (!categoryEmojis?.length) continue

			nextSections.push({
				title: category,
				emojis: categoryEmojis,
			})
		}

		return nextSections
	}, [emojisByCategory, queryTokens])

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
		dismissSheet()
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
						{/* Note: TurboImage allegedly supports GIF but I couldn't get animation to work */}
						<Image
							source={{
								uri: emoji.url,
								headers: {
									Authorization: sdk.authorizationHeader || '',
								},
							}}
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
			header={<SheetHeader title="Emojis" onClose={dismissSheet} />}
			scrollable
		>
			<View className="px-4 py-2">
				<Input
					value={searchQuery}
					onChangeText={setSearchQuery}
					placeholder="Search emojis"
					autoCorrect={false}
					autoCapitalize="none"
					returnKeyType="search"
				/>
			</View>
			<FlashList
				data={listData}
				keyExtractor={(item) => item.key}
				ListEmptyComponent={
					<View className="items-center px-4 py-8">
						<Text className="text-foreground-muted">No emojis found</Text>
					</View>
				}
				renderItem={({ item }) => {
					if (item.type === 'header') {
						return (
							<View className="px-4 pb-1 pt-3">
								<Text className="font-semibold text-foreground-muted">
									{LABELS[item.title as keyof typeof LABELS] ?? item.title}
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
