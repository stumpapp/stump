import { FlashList } from '@shopify/flash-list'
import { asc, desc, eq, inArray } from 'drizzle-orm'
import { useLiveQuery } from 'drizzle-orm/expo-sqlite'
import { useFocusEffect } from 'expo-router'
import groupBy from 'lodash/groupBy'
import { useCallback, useEffect, useMemo } from 'react'
import { View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { match } from 'ts-pattern'

import {
	CuratedDownloadsHeader,
	DownloadRowItem,
	intoDownloadedFile,
	NoDownloadsOnDevice,
} from '~/components/downloads'
import { useDownloadsState } from '~/components/downloads/store'
import { Text } from '~/components/ui'
import { db, downloadedFiles, libraryRefs, readProgress, seriesRefs } from '~/db'
import { usePreferencesStore } from '~/stores'
import { useSelectionStore } from '~/stores/selection'

export default function Screen() {
	// Note: The id is a workaround for https://github.com/drizzle-team/drizzle-orm/issues/2660
	const { id, increment, sortConfig } = useDownloadsState((state) => ({
		id: state.fetchCounter,
		increment: state.increment,
		sortConfig: state.sort,
	}))

	const orderFn = match(sortConfig.direction)
		.with('ASC', () => asc)
		.with('DESC', () => desc)
		.otherwise(() => (sortConfig.option === 'ADDED_AT' ? desc : asc))

	const dbOrderBy = match(sortConfig.option)
		.with('NAME', () => orderFn(downloadedFiles.bookName))
		.with('ADDED_AT', () => orderFn(downloadedFiles.downloadedAt))
		.with('SERIES', () => [orderFn(seriesRefs.name), asc(downloadedFiles.bookName)])
		.otherwise(() => orderFn(downloadedFiles.downloadedAt))

	const { data } = useLiveQuery(
		db
			.select()
			.from(downloadedFiles)
			.leftJoin(readProgress, eq(downloadedFiles.id, readProgress.bookId))
			.leftJoin(seriesRefs, eq(downloadedFiles.seriesId, seriesRefs.id))
			.leftJoin(libraryRefs, eq(seriesRefs.libraryId, libraryRefs.id))
			.orderBy(() => dbOrderBy),
		[id, sortConfig],
	)

	const showCuratedDownloads = usePreferencesStore((state) => state.showCuratedDownloads)
	const isSelecting = useSelectionStore((state) => state.isSelecting)
	const resetSelection = useSelectionStore((state) => state.resetSelection)

	useFocusEffect(
		useCallback(
			() => {
				// Force re-query on focus
				increment()
				return () => {
					// Reset selection on blur
					resetSelection()
				}
			},
			// eslint-disable-next-line react-hooks/exhaustive-deps
			[increment],
		),
	)

	const artificiallyGroupedData = useMemo(() => {
		if (sortConfig.option !== 'SERIES') {
			return data
		}
		// We create a sectioned list by grouping by series, then flatten it so that we have something like:
		// ["Series 1", item1, item2, "Series 2", item3, item4]
		// See  https://shopify.github.io/flash-list/docs/guides/section-list/
		const grouped = groupBy(data, (item) => item.series_refs?.name || 'Unknown')
		return Object.entries(grouped).flatMap(([seriesName, items]) => {
			return [seriesName, ...items]
		})
	}, [sortConfig, data])

	const renderItem = useCallback(({ item }: { item: (typeof data)[0] | string }) => {
		if (typeof item === 'string') {
			return <Text className="px-4 text-lg font-medium">{item}</Text>
		}

		return <DownloadRowItem downloadedFile={intoDownloadedFile(item as (typeof data)[0])} />
	}, [])

	const stickyHeaderIndices = useMemo(() => {
		if (sortConfig.option !== 'SERIES') {
			return undefined
		}

		const indices: number[] = []
		let currentIndex = 0
		for (const item of artificiallyGroupedData) {
			if (typeof item === 'string') {
				indices.push(currentIndex)
			}
			currentIndex++
		}
		return indices
	}, [sortConfig, artificiallyGroupedData])

	const selectionStore = useSelectionStore((state) => state)

	const customSelectionActions = useMemo(
		() => ({
			deleteSelection: async (ids: string[]) => {
				await db.delete(downloadedFiles).where(inArray(downloadedFiles.id, ids)).run()
				// Trigger re-fetch
				increment()
			},
			// TODO: Support file sharing
			// shareSelection: async (ids: string[]) => {},
		}),
		[increment],
	)

	useEffect(
		() => {
			const allIds =
				data?.filter((item) => typeof item !== 'string').map((item) => item.downloaded_files.id) ||
				[]
			selectionStore.setItemIdents(allIds)
			selectionStore.registerCustomActions(customSelectionActions)
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[data],
	)

	// TODO: Display as grid option?
	// TODO: Selection mode to delete multiple at once
	// TODO: Search downloads

	if (!data || data.length === 0) {
		return (
			<SafeAreaView style={{ flex: 1 }} edges={['left', 'right']}>
				<NoDownloadsOnDevice />
			</SafeAreaView>
		)
	}

	return (
		<FlashList
			data={artificiallyGroupedData}
			renderItem={renderItem}
			keyExtractor={(item) => (typeof item === 'string' ? item : item.downloaded_files.id)}
			contentContainerStyle={{
				paddingVertical: 16,
			}}
			contentInsetAdjustmentBehavior="always"
			ItemSeparatorComponent={() => <View className="h-6" />}
			ListHeaderComponent={
				showCuratedDownloads && !isSelecting ? <CuratedDownloadsHeader /> : undefined
			}
			stickyHeaderIndices={stickyHeaderIndices}
			getItemType={(item) => (typeof item === 'string' ? 'sectionHeader' : 'row')}
			maintainVisibleContentPosition={{ disabled: true }}
		/>
	)
}
