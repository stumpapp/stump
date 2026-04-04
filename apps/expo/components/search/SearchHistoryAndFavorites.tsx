import { Bookmark, BookmarkX, Clock, Trash } from 'lucide-react-native'
import { Pressable, ScrollView, View } from 'react-native'
import { useShallow } from 'zustand/react/shallow'

import { useActiveServer } from '~/components/activeServer'
import { Icon, ListLabel, Text } from '~/components/ui'
import { ContextMenu } from '~/components/ui/context-menu/context-menu'
import { useColors } from '~/lib/constants'
import { useCuratedSearch, useSearchStore } from '~/stores/search'

import { Divider } from '../Divider'

type Props = {
	onSelect: (query: string) => void
}

export function SearchHistoryAndFavorites({ onSelect }: Props) {
	const {
		activeServer: { id: serverID },
	} = useActiveServer()
	const { favoriteSearches, searchHistory } = useCuratedSearch()
	const { favoriteSearch, unfavoriteSearch, clearSearchHistory, removeFromHistory } =
		useSearchStore(
			useShallow((state) => ({
				favoriteSearch: state.favoriteSearch,
				unfavoriteSearch: state.unfavoriteSearch,
				clearSearchHistory: state.clearSearchHistory,
				removeFromHistory: state.removeFromHistory,
			})),
		)
	const colors = useColors()

	const hasFavorites = favoriteSearches.length > 0
	const hasHistory = searchHistory.length > 0
	const favoriteQuerySet = new Set(favoriteSearches.map((r) => r.query))

	if (!hasFavorites && !hasHistory) {
		return (
			<View className="px-4 pt-20 flex-1 items-center justify-center">
				<Text size="lg" className="text-center text-foreground-muted">
					Your favorites and recent searches will appear here
				</Text>
			</View>
		)
	}

	return (
		<ScrollView
			className="flex-1 bg-background"
			contentInsetAdjustmentBehavior="automatic"
			keyboardShouldPersistTaps="handled"
		>
			{hasFavorites && (
				<View className="px-4 pt-6">
					<ListLabel className="mb-1">Favorites</ListLabel>
					{favoriteSearches.map((record, index) => (
						<View key={record.query}>
							{index > 0 && <Divider />}
							<ContextMenu
								onPress={() => onSelect(record.query)}
								groups={[
									{
										items: [
											{
												label: 'Unfavorite',
												icon: { ios: 'bookmark.slash', android: BookmarkX },
												onPress: () => unfavoriteSearch(record.query, serverID),
												role: 'destructive',
											},
										],
									},
								]}
							>
								<View className="`gap-3 py-3 flex-row items-center">
									<Icon as={Bookmark} size={16} color={colors.fill.brand.DEFAULT} />
									<Text className="flex-1">{record.query}</Text>
								</View>
							</ContextMenu>
						</View>
					))}
				</View>
			)}

			{hasHistory && (
				<View className="px-4 pt-6">
					<View className="mb-1 flex-row items-center justify-between">
						<ListLabel>Recently Searched</ListLabel>
						<Pressable onPress={() => clearSearchHistory(serverID)} hitSlop={10}>
							<Text className="text-fill-danger">Clear</Text>
						</Pressable>
					</View>
					{searchHistory.map((record, index) => (
						<View key={record.query}>
							{index > 0 && <Divider />}
							<ContextMenu
								onPress={() => onSelect(record.query)}
								groups={[
									{
										items: [
											...(!favoriteQuerySet.has(record.query)
												? [
														{
															label: 'Favorite',
															icon: {
																ios: 'bookmark.fill' as const,
																android: Bookmark,
															},
															onPress: () => favoriteSearch(record.query, serverID),
														},
													]
												: [
														{
															label: 'Unfavorite',
															icon: {
																ios: 'bookmark.slash' as const,
																android: BookmarkX,
															},
															onPress: () => unfavoriteSearch(record.query, serverID),
														},
													]),
											{
												label: 'Remove',
												icon: { ios: 'trash', android: Trash },
												onPress: () => removeFromHistory(record.query, serverID),
												role: 'destructive' as const,
											},
										],
									},
								]}
							>
								<View className="gap-3 py-3 flex-row items-center">
									<Icon as={Clock} size={16} color={colors.foreground.muted} />
									<Text className="flex-1">{record.query}</Text>
								</View>
							</ContextMenu>
						</View>
					))}
				</View>
			)}
		</ScrollView>
	)
}
