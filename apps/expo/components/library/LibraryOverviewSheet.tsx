import { TrueSheet } from '@lodev09/react-native-true-sheet'
import { PREFETCH_STALE_TIME, useSDK, useSuspenseGraphQL } from '@stump/client'
import { graphql, LibraryOverviewSheetQuery } from '@stump/graphql'
import { formatHumanDuration } from '@stump/i18n'
import { useQueryClient } from '@tanstack/react-query'
import { BookCheck, BookOpen, Clock, HardDrive, Layers, Library } from 'lucide-react-native'
import { forwardRef, useState } from 'react'
import { View } from 'react-native'
import { ScrollView } from 'react-native-gesture-handler'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { IS_IOS_24_PLUS, useColors } from '~/lib/constants'
import { formatBytesSeparate } from '~/lib/format'

import { useGridItemSize } from '../grid/useGridItemSize'
import { SheetBackDetection } from '../SheetBackDetection'
import { StatCard, StatCardProps } from '../StatCard'
import { Heading, Text } from '../ui'

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
	const [isOpen, setIsOpen] = useState(false)

	const colors = useColors()
	const insets = useSafeAreaInsets()

	if (!library) {
		return null
	}

	return (
		<>
			<TrueSheet
				ref={ref}
				detents={[0.5, 1]}
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
				onDidPresent={() => setIsOpen(true)}
				onDidDismiss={() => setIsOpen(false)}
			>
				<SheetContent library={library} />
			</TrueSheet>

			{/*@ts-expect-error: it should be fine*/}
			<SheetBackDetection ref={ref} isOpen={isOpen} />
		</>
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

	const formattedSize = formatBytesSeparate(stats.totalBytes)
	const formattedTime = formatHumanDuration(stats.totalReadingTimeSeconds, { significantUnits: 1 })
	// hopefully suffix is okay for other languages
	const [, formattedTimeValue, formattedTimeUnit] = formattedTime.match(/^(\d+)\s*(.+)$/) || []

	const { itemWidth } = useGridItemSize({
		horizontalGap: 7, // gap-2 on grid = 7px
		padding: 42, // p-6 on sheet = 21px * 2 sides = 42px
	})

	const libraryStats = [
		{
			label: 'In Progress',
			value: stats.inProgressBooks,
			icon: BookOpen,
			baseColor: '#f59e0b', // amber-500
		},
		{
			label: 'Completed',
			value: stats.completedBooks,
			suffix: `/ ${stats.bookCount}`,
			icon: BookCheck,
			baseColor: '#f87171', // red-400
		},
		{
			label: 'Books',
			value: stats.bookCount,
			icon: Library,
			baseColor: '#60a5fa', // blue-400
		},
		{
			label: 'Series',
			value: stats.seriesCount,
			icon: Layers,
			baseColor: '#c084fc', // purple-400
		},
		{
			label: 'Reading Time',
			value: formattedTimeValue || 0,
			suffix: formattedTimeUnit,
			icon: Clock,
			baseColor: '#34d399', // emerald-400
		},
		{
			label: 'Size',
			value: formattedSize ? formattedSize.value : 'Unknown',
			suffix: formattedSize ? formattedSize.unit : '',
			icon: HardDrive,
			baseColor: '#94a3b8', // slate-400
		},
	] satisfies StatCardProps[]

	return (
		<ScrollView className="p-6 flex-1" nestedScrollEnabled>
			<View className="gap-8">
				<View>
					<Heading size="2xl" numberOfLines={3}>
						{library.name}
					</Heading>

					{library.description && (
						<Text className="mt-2 text-lg text-foreground-muted">{library.description}</Text>
					)}

					{library.tags.length > 0 && (
						<View className="mt-4 gap-3 flex flex-row flex-wrap">
							{library.tags.map((tag) => (
								<Text key={tag.name} className="text-foreground-muted">
									#{tag.name}
								</Text>
							))}
						</View>
					)}
				</View>

				<View className="gap-2 flex-row flex-wrap justify-center">
					{libraryStats.map((stat, index) => (
						<StatCard key={index} {...stat} style={{ width: itemWidth }} />
					))}
				</View>
			</View>
		</ScrollView>
	)
}
