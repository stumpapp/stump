import { FlashList } from '@shopify/flash-list'
import { and, desc, eq, isNull, lt, or, sql } from 'drizzle-orm'
import { useLiveQuery } from 'drizzle-orm/expo-sqlite'
import { Fragment, useMemo } from 'react'
import { View } from 'react-native'

import { db, downloadedFiles, libraryRefs, readProgress, seriesRefs } from '~/db'
import { useListItemSize, useTranslate } from '~/lib/hooks'
import {
	useReadingNowWidgetSync,
	WidgetSyncBook,
} from '~/lib/hooks/widgetSync/useReadingNowWidgetSync'

import { Heading } from '../ui'
import DownloadedListItem from './DownloadedListItem'
import ReadingNow from './ReadingNow'
import { useDownloadsState } from './store'
import { intoDownloadedFile } from './types'
import { getThumbnailPath } from './utils'

export default function ContinueReading() {
	const { t } = useTranslate()
	// Note: This is a workaround for https://github.com/drizzle-team/drizzle-orm/issues/2660
	const id = useDownloadsState((state) => state.fetchCounter)

	const { data } = useLiveQuery(
		db
			.select()
			.from(downloadedFiles)
			.innerJoin(
				readProgress,
				and(
					eq(downloadedFiles.id, readProgress.bookId),
					// we only care about books that haven't been finished yet
					or(
						isNull(readProgress.percentage),
						lt(sql`CAST(${readProgress.percentage} AS REAL)`, 1), // let's see if we need sm like 0.998
					),
				),
			)
			.leftJoin(seriesRefs, eq(downloadedFiles.seriesId, seriesRefs.id))
			.leftJoin(libraryRefs, eq(seriesRefs.libraryId, libraryRefs.id))
			.orderBy(desc(readProgress.lastModified), desc(downloadedFiles.downloadedAt)),
		['continue-reading', id],
	)

	// Take the first 5 books as "currently reading"
	const activeBooks = useMemo(() => data?.slice(0, 5) || [], [data])

	const widgetSyncBooks = useMemo(
		() =>
			activeBooks.map(
				(book) =>
					({
						id: book.downloaded_files.id,
						resolvedName: book.downloaded_files.bookName || book.downloaded_files.filename,
						thumbnail: {
							url: getThumbnailPath(book.downloaded_files) || '',
						},
						readProgress: book.read_progress
							? {
									percentageCompleted: book.read_progress.percentage?.toString() || null,
									updatedAt: book.read_progress.lastModified?.toISOString() || null,
								}
							: undefined,
						isReadingOffline: true,
						serverId: book.downloaded_files.serverId,
					}) satisfies WidgetSyncBook,
			),
		[activeBooks],
	)

	useReadingNowWidgetSync(widgetSyncBooks)

	const leftOffBooks = useMemo(
		() =>
			data?.filter(
				({ downloaded_files: { id: dfId } }) =>
					!activeBooks.some((book) => book.downloaded_files.id === dfId),
			) || [],
		[data, activeBooks],
	)

	const { horizontalGap } = useListItemSize()

	return (
		<Fragment
			key={`continue-reading-section-${activeBooks.length ? 'at-least-one-item' : 'empty'}`} // Force re-render when switching between empty and non-empty states
		>
			{activeBooks.length > 0 && <ReadingNow books={activeBooks.map(intoDownloadedFile)} />}

			{leftOffBooks.length > 0 && (
				<View className="flex">
					<Heading size="xl" className="px-4">
						{t('stumpServer.continueReading.label')}
					</Heading>

					<FlashList
						data={leftOffBooks}
						keyExtractor={({ downloaded_files: { id } }) => id}
						renderItem={({ item }) => <DownloadedListItem book={intoDownloadedFile(item)} />}
						horizontal
						contentContainerStyle={{ padding: 16 }}
						onEndReachedThreshold={0.85}
						showsHorizontalScrollIndicator={false}
						ItemSeparatorComponent={() => <View style={{ width: horizontalGap }} />}
					/>
				</View>
			)}
		</Fragment>
	)
}
