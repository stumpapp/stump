import { TrueSheet } from '@lodev09/react-native-true-sheet'
import { PREFETCH_STALE_TIME, useSDK, useSuspenseGraphQL } from '@stump/client'
import { graphql, LibraryOverviewSheetQuery } from '@stump/graphql'
import { useQueryClient } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { forwardRef, useMemo } from 'react'
import { View } from 'react-native'
import { ScrollView } from 'react-native-gesture-handler'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { IS_IOS_24_PLUS, useColors } from '~/lib/constants'
import { formatBytes } from '~/lib/format'

import { InfoStat } from '../stats'
import { Card, Heading, Text } from '../ui'

const query = graphql(`
	query LibraryOverviewSheet($id: ID!) {
		libraryById(id: $id) {
			name
			description
			stats {
				seriesCount
				bookCount
				totalBytes
				completedBooks
				inProgressBooks
				totalReadingTimeSeconds
			}
			tags {
				name
			}
		}
	}
`)

export const usePrefetchLibraryOverview = () => {
	const client = useQueryClient()
	const { sdk } = useSDK()
	return (id: string) =>
		client.prefetchQuery({
			queryKey: sdk.cacheKey('libraryById', ['overviewSheet', id]),
			queryFn: () => sdk.execute(query, { id }),
			staleTime: PREFETCH_STALE_TIME,
		})
}

type Props = {
	libraryId: string
}

export const LibraryOverviewSheet = forwardRef<TrueSheet, Props>(({ libraryId }, ref) => {
	const { sdk } = useSDK()
	const {
		data: { libraryById: library },
	} = useSuspenseGraphQL(query, sdk.cacheKey('libraryById', ['overviewSheet', libraryId]), {
		id: libraryId,
	})

	const colors = useColors()
	const insets = useSafeAreaInsets()

	if (!library) {
		return null
	}

	return (
		<TrueSheet
			ref={ref}
			detents={['auto', 1]}
			cornerRadius={24}
			grabber
			scrollable
			backgroundColor={IS_IOS_24_PLUS ? undefined : colors.sheet.background}
			grabberOptions={{
				color: colors.sheet.grabber,
			}}
			style={{
				paddingBottom: insets.bottom,
			}}
			insetAdjustment="automatic"
		>
			<SheetContent library={library} />
		</TrueSheet>
	)
})
LibraryOverviewSheet.displayName = 'LibraryOverviewSheet'

type SheetContentProps = {
	library: NonNullable<LibraryOverviewSheetQuery['libraryById']>
}

// TODO: make less ugly, low key kinda ugly tbh. I think my brain wants a grid rather than flex wrap maybe
// TODO: Show more stuff
function SheetContent({ library }: SheetContentProps) {
	const { stats } = library

	const formattedSize = formatBytes(stats.totalBytes)
	const formattedTime = useMemo(() => {
		if (stats.totalReadingTimeSeconds >= 3600 && stats.totalReadingTimeSeconds < 3600 * 2) {
			return dayjs.duration(stats.totalReadingTimeSeconds, 'seconds').format('H [hr] m [mins]')
		} else if (stats.totalReadingTimeSeconds >= 60) {
			return dayjs.duration(stats.totalReadingTimeSeconds, 'seconds').format('m [mins]')
		} else {
			return dayjs.duration(stats.totalReadingTimeSeconds, 'seconds').format('s [secs]')
		}
	}, [stats.totalReadingTimeSeconds])

	return (
		<ScrollView className="flex-1 p-6" nestedScrollEnabled>
			<View className="gap-8">
				<View>
					<Heading size="2xl" numberOfLines={3}>
						{library.name}
					</Heading>

					{library.description && (
						<Text className="mt-2 text-lg text-foreground/90">{library.description}</Text>
					)}

					{library.tags.length > 0 && (
						<View className="mt-4 flex flex-row flex-wrap gap-3">
							{library.tags.map((tag) => (
								<Text key={tag.name} className="text-foreground-muted">
									#{tag.name}
								</Text>
							))}
						</View>
					)}
				</View>

				<Card label="Stats" className="flex flex-row flex-wrap justify-around gap-x-6 gap-y-4">
					<InfoStat size="md" label="Series" value={stats.seriesCount.toString()} />
					<InfoStat size="md" label="Books" value={stats.bookCount.toString()} />
					{formattedSize && <InfoStat size="md" label="Size" value={formattedSize} />}
					<InfoStat size="md" label="In Progress" value={stats.inProgressBooks.toString()} />
					<InfoStat
						size="md"
						label="Completed"
						value={`${stats.completedBooks} / ${stats.bookCount}`}
					/>
					{stats.totalReadingTimeSeconds > 0 && (
						<InfoStat size="md" label="Reading Time" value={formattedTime} />
					)}
				</Card>
			</View>
		</ScrollView>
	)
}
