import { FlashList } from '@shopify/flash-list'
import { desc, eq } from 'drizzle-orm'
import { useLiveQuery } from 'drizzle-orm/expo-sqlite'
import { useFocusEffect } from 'expo-router'
import { useCallback } from 'react'
import { View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import {
	CuratedDownloadsHeader,
	DownloadRowItem,
	intoDownloadedFile,
	NoDownloadsOnDevice,
} from '~/components/downloads'
import { useDownloadsFetcherStore } from '~/components/downloads/store'
import { db, downloadedFiles, libraryRefs, readProgress, seriesRefs } from '~/db'
import { usePreferencesStore } from '~/stores'

export default function Screen() {
	// Note: This is a workaround for https://github.com/drizzle-team/drizzle-orm/issues/2660
	const { id, increment } = useDownloadsFetcherStore((state) => ({
		id: state.fetchCounter,
		increment: state.increment,
	}))

	const { data } = useLiveQuery(
		db
			.select()
			.from(downloadedFiles)
			.leftJoin(readProgress, eq(downloadedFiles.id, readProgress.bookId))
			.leftJoin(seriesRefs, eq(downloadedFiles.seriesId, seriesRefs.id))
			.leftJoin(libraryRefs, eq(seriesRefs.libraryId, libraryRefs.id))
			.orderBy(desc(readProgress.lastModified), desc(downloadedFiles.downloadedAt)),
		[id],
	)

	const showCuratedDownloads = usePreferencesStore((state) => state.showCuratedDownloads)

	useFocusEffect(
		useCallback(() => {
			// Force re-query on focus
			increment()
		}, [increment]),
	)

	// console.log('Downloaded files with joins:', data)
	// TODO: A reading now section like in server stack
	// TODO: 1-2 other curated sections? Only if config to disable them bc i can see ppl not wanting it for downloads
	// TODO: Display as grid option?
	// TODO: Selection mode to delete multiple at once
	// TODO: Search downloads
	// TODO: A few sorting options

	if (!data || data.length === 0) {
		return (
			<SafeAreaView style={{ flex: 1 }} edges={['left', 'right']}>
				<NoDownloadsOnDevice />
			</SafeAreaView>
		)
	}

	return (
		<SafeAreaView style={{ flex: 1 }} edges={['left', 'right']}>
			<FlashList
				data={data}
				renderItem={({ item }) => <DownloadRowItem downloadedFile={intoDownloadedFile(item)} />}
				keyExtractor={(item) => item.downloaded_files.id}
				contentContainerStyle={{
					padding: 16,
				}}
				contentInsetAdjustmentBehavior="always"
				ItemSeparatorComponent={() => <View className="h-6" />}
				ListHeaderComponent={showCuratedDownloads ? <CuratedDownloadsHeader /> : undefined}
			/>
		</SafeAreaView>
	)
}
