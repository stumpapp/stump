import { TrueSheet } from '@lodev09/react-native-true-sheet'
import { FlashList } from '@shopify/flash-list'
import { useGraphQL } from '@stump/client'
import {
	BookClubBookInput,
	BookClubSuggestionStatus,
	graphql,
	SuggestionsPickerSheetQuery,
} from '@stump/graphql'
import { BookOpen } from 'lucide-react-native'
import { forwardRef, useCallback, useImperativeHandle, useRef, useState } from 'react'
import { View } from 'react-native'
import { Pressable } from 'react-native-gesture-handler'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { IS_IOS_26_PLUS, useColors } from '~/lib/constants'
import { useTranslate } from '~/lib/hooks'

import ListEmpty from '../ListEmpty'
import { SheetBackDetection } from '../SheetBackDetection'
import { Icon, SheetHeader, Text } from '../ui'
import { useBookClubContext } from './context'

const suggestionsQuery = graphql(`
	query SuggestionsPickerSheet($bookClubId: ID!, $status: BookClubSuggestionStatus) {
		bookClubSuggestions(bookClubId: $bookClubId, status: $status) {
			id
			title
			author
			url
			bookId
			notes
			suggestedBy {
				user {
					username
				}
			}
		}
	}
`)

export type SuggestionsPickerSheetRef = {
	open: () => void
	close: () => void
}

type Props = {
	onAddBook: (input: BookClubBookInput) => void
}

type Suggestion = SuggestionsPickerSheetQuery['bookClubSuggestions'][number]

export const SuggestionsPickerSheet = forwardRef<SuggestionsPickerSheetRef, Props>(
	({ onAddBook }, ref) => {
		const { t } = useTranslate()
		const sheetRef = useRef<TrueSheet>(null)
		const { clubId } = useBookClubContext()

		const colors = useColors()
		const insets = useSafeAreaInsets()

		const { data, refetch } = useGraphQL(
			suggestionsQuery,
			['bookClubSuggestions', clubId, BookClubSuggestionStatus.Pending],
			{ bookClubId: clubId, status: BookClubSuggestionStatus.Pending },
		)

		useImperativeHandle(ref, () => ({
			open: () => {
				refetch()
				sheetRef.current?.present()
			},
			close: () => {
				sheetRef.current?.dismiss()
			},
		}))

		const handleSelectSuggestion = useCallback(
			(suggestion: Suggestion) => {
				if (suggestion.bookId) {
					onAddBook({ stored: { id: suggestion.bookId } })
				} else {
					onAddBook({
						external: {
							title: suggestion.title || '',
							author: suggestion.author || '',
							url: suggestion.url || undefined,
						},
					})
				}
				sheetRef.current?.dismiss()
			},
			[onAddBook],
		)

		const suggestions = data?.bookClubSuggestions ?? []

		const [isOpen, setIsOpen] = useState(false)

		return (
			<>
				<TrueSheet
					ref={sheetRef}
					detents={[1]}
					grabber
					scrollable
					backgroundColor={IS_IOS_26_PLUS ? undefined : colors.sheet.background}
					grabberOptions={{ color: colors.sheet.grabber }}
					style={{ paddingBottom: insets.bottom }}
					insetAdjustment="automatic"
					header={
						<SheetHeader
							title={t('bookClub.memberSuggestions')}
							onClose={() => sheetRef.current?.dismiss()}
						/>
					}
					onDidPresent={() => setIsOpen(true)}
					onDidDismiss={() => setIsOpen(false)}
				>
					<FlashList
						data={suggestions}
						renderItem={({ item }) => (
							<SuggestionRow suggestion={item} onSelect={() => handleSelectSuggestion(item)} />
						)}
						contentContainerStyle={{ paddingVertical: 8, paddingHorizontal: 16 }}
						contentInsetAdjustmentBehavior="automatic"
						ListEmptyComponent={<ListEmpty message={t('bookClub.noMemberSuggestions')} />}
						ItemSeparatorComponent={() => <View className="h-2" />}
					/>
				</TrueSheet>

				<SheetBackDetection ref={sheetRef} isOpen={isOpen} />
			</>
		)
	},
)

SuggestionsPickerSheet.displayName = 'SuggestionsPickerSheet'

type SuggestionRowProps = {
	suggestion: Suggestion
	onSelect: () => void
}

// TODO(book-club): MAke not ugly, just a mock at this point really
function SuggestionRow({ suggestion, onSelect }: SuggestionRowProps) {
	const { t } = useTranslate()
	const suggestedByName = suggestion.suggestedBy?.user?.username ?? t('common.unknown')

	return (
		<Pressable onPress={onSelect}>
			<View className="gap-3 bg-black/5 p-3 dark:bg-white/10 flex-row items-center rounded-2xl active:opacity-80">
				<View className="dark:bg-white/15 h-12 w-9 bg-black/10 items-center justify-center rounded-md">
					<Icon as={BookOpen} size={16} className="text-foreground-muted" />
				</View>

				<View className="gap-0.5 flex-1">
					<Text className="text-base font-medium" numberOfLines={1}>
						{suggestion.title || t('common.unknownTitle')}
					</Text>
					{suggestion.author && (
						<Text className="text-sm text-foreground-muted" numberOfLines={1}>
							{suggestion.author}
						</Text>
					)}
					<Text className="text-xs text-foreground-muted">
						{t('bookClub.suggestedBy', { name: suggestedByName })}
					</Text>
				</View>

				{suggestion.notes && (
					<Text
						className="text-xs text-foreground-muted max-w-[120px] text-right italic"
						numberOfLines={2}
					>
						&ldquo;{suggestion.notes}&rdquo;
					</Text>
				)}
			</View>
		</Pressable>
	)
}
