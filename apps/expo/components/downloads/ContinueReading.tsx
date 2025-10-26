import { FlashList } from '@shopify/flash-list'
import { desc, eq } from 'drizzle-orm'
import { useLiveQuery } from 'drizzle-orm/expo-sqlite'
import { Fragment, useMemo } from 'react'
import { View } from 'react-native'

import { db, downloadedFiles, libraryRefs, readProgress, seriesRefs } from '~/db'
import { useListItemSize } from '~/lib/hooks'

import { Heading } from '../ui'
import DownloadedListItem from './DownloadedListItem'
import ReadingNow from './ReadingNow'
import { useDownloadsState } from './store'
import { intoDownloadedFile } from './types'

export default function ContinueReading() {
	// Note: This is a workaround for https://github.com/drizzle-team/drizzle-orm/issues/2660
	const id = useDownloadsState((state) => state.fetchCounter)

	const { data } = useLiveQuery(
		db
			.select()
			.from(downloadedFiles)
			.innerJoin(readProgress, eq(downloadedFiles.id, readProgress.bookId))
			.leftJoin(seriesRefs, eq(downloadedFiles.seriesId, seriesRefs.id))
			.leftJoin(libraryRefs, eq(seriesRefs.libraryId, libraryRefs.id))
			.orderBy(desc(readProgress.lastModified), desc(downloadedFiles.downloadedAt)),
		['continue-reading', id],
	)

	// Take the first 5 books as "currently reading"
	const activeBooks = useMemo(() => data?.slice(0, 5) || [], [data])

	const leftOffBooks = useMemo(
		() =>
			data?.filter(
				({ downloaded_files: { id: dfId } }) =>
					!activeBooks.some((book) => book.downloaded_files.id === dfId),
			) || [],
		[data, activeBooks],
	)

	const { gap } = useListItemSize()

	return (
		<Fragment
			key={`continue-reading-section-${activeBooks.length ? 'at-least-one-item' : 'empty'}`} // Force re-render when switching between empty and non-empty states
		>
			{activeBooks.length > 0 && <ReadingNow books={activeBooks.map(intoDownloadedFile)} />}

			{leftOffBooks.length > 0 && (
				<View className="flex">
					<Heading size="xl" className="px-4">
						Continue Reading
					</Heading>

					<FlashList
						data={leftOffBooks}
						keyExtractor={({ downloaded_files: { id } }) => id}
						renderItem={({ item }) => <DownloadedListItem book={intoDownloadedFile(item)} />}
						horizontal
						contentContainerStyle={{ padding: 16 }}
						onEndReachedThreshold={0.85}
						showsHorizontalScrollIndicator={false}
						ItemSeparatorComponent={() => <View style={{ width: gap * 2 }} />}
					/>
				</View>
			)}
		</Fragment>
	)
}
