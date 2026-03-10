import { Host, Image } from '@expo/ui/swift-ui'
import { TrueSheet } from '@lodev09/react-native-true-sheet'
import { BookClubBookInput } from '@stump/graphql'
import { Lightbulb, PenLine, Search } from 'lucide-react-native'
import { forwardRef, useCallback, useImperativeHandle, useRef } from 'react'
import { Platform, View } from 'react-native'
import { Pressable } from 'react-native-gesture-handler'

import { IS_IOS_24_PLUS, useColors } from '~/lib/constants'

import { Icon, Text } from '../ui'
import { AddBookSheet, type AddBookSheetRef, usePrefetchAddBookSheet } from './AddBookSheet'
import { ManualBookEntrySheet, type ManualBookEntrySheetRef } from './ManualBookEntrySheet'
import { SuggestionsPickerSheet, type SuggestionsPickerSheetRef } from './SuggestionsPickerSheet'

// TODO: I know I will need to either generalize this or copy/paste bits because there will
// be a lot of shared logic when I add the voting system

export type AddBookOption = 'search' | 'manual' | 'suggestions'

export type AddBookOptionsSheetRef = {
	open: () => void
	close: () => void
}

type Props = {
	onAddBook: (input: BookClubBookInput) => void
}

export const AddBookOptionsSheet = forwardRef<AddBookOptionsSheetRef, Props>(
	({ onAddBook }, ref) => {
		const sheetRef = useRef<TrueSheet>(null)
		const addSheetRef = useRef<AddBookSheetRef>(null)
		const manualSheetRef = useRef<ManualBookEntrySheetRef>(null)
		const suggestionsSheetRef = useRef<SuggestionsPickerSheetRef>(null)

		const prefetchAddBookSheet = usePrefetchAddBookSheet()
		const colors = useColors()

		useImperativeHandle(ref, () => ({
			open: () => {
				sheetRef.current?.present()
			},
			close: () => {
				sheetRef.current?.dismiss()
			},
		}))

		const handleOptionPress = useCallback((option: AddBookOption) => {
			switch (option) {
				case 'search':
					addSheetRef.current?.open()
					break
				case 'manual':
					manualSheetRef.current?.open()
					break
				case 'suggestions':
					suggestionsSheetRef.current?.open()
					break
			}
		}, [])

		return (
			<TrueSheet
				ref={sheetRef}
				detents={['auto']}
				cornerRadius={24}
				grabber
				backgroundColor={IS_IOS_24_PLUS ? undefined : colors.sheet.background}
				grabberOptions={{ color: colors.sheet.grabber }}
				onDidPresent={prefetchAddBookSheet}
			>
				<View className="gap-2 p-4 pb-8">
					<Text className="mb-2 text-lg font-semibold">Add a book</Text>

					<OptionRow
						label="Search server"
						description="Find a book from your library"
						icon="search"
						onPress={() => handleOptionPress('search')}
					/>

					<OptionRow
						label="Enter manually"
						description="Add a book not on your server"
						icon="manual"
						onPress={() => handleOptionPress('manual')}
					/>

					<OptionRow
						label="From suggestions"
						description="Pick from member suggestions"
						icon="suggestions"
						onPress={() => handleOptionPress('suggestions')}
					/>
				</View>

				<AddBookSheet ref={addSheetRef} onAddBook={onAddBook} />

				<ManualBookEntrySheet ref={manualSheetRef} onAddBook={onAddBook} />

				<SuggestionsPickerSheet ref={suggestionsSheetRef} onAddBook={onAddBook} />
			</TrueSheet>
		)
	},
)

AddBookOptionsSheet.displayName = 'AddBookOptionsSheet'

type OptionRowProps = {
	label: string
	description: string
	icon: 'search' | 'manual' | 'suggestions'
	onPress: () => void
}

function OptionRow({ label, description, icon, onPress }: OptionRowProps) {
	return (
		<Pressable onPress={onPress}>
			<View className="ios:rounded-[2rem] flex-row items-center gap-4 rounded-3xl bg-black/5 p-4 active:opacity-80 dark:bg-white/10">
				<View className="dark:bg-white/15 h-10 w-10 items-center justify-center rounded-full bg-black/10">
					{optionIcons[icon]}
				</View>
				<View className="flex-1 gap-0.5">
					<Text className="text-base font-medium">{label}</Text>
					<Text className="text-sm text-foreground-muted">{description}</Text>
				</View>
			</View>
		</Pressable>
	)
}

const optionIcons: Record<OptionRowProps['icon'], React.ReactNode> = {
	search: Platform.select({
		ios: (
			<Host matchContents>
				<Image systemName="magnifyingglass" size={18} />
			</Host>
		),
		android: <Icon as={Search} size={18} />,
	}),
	manual: Platform.select({
		ios: (
			<Host matchContents>
				<Image systemName="square.and.pencil" size={18} />
			</Host>
		),
		android: <Icon as={PenLine} size={18} />,
	}),
	suggestions: Platform.select({
		ios: (
			<Host matchContents>
				<Image systemName="lightbulb" size={18} />
			</Host>
		),
		android: <Icon as={Lightbulb} size={18} />,
	}),
}
