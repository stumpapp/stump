import { TrueSheet } from '@lodev09/react-native-true-sheet'
import { PREFETCH_STALE_TIME, useSDK, useSuspenseGraphQL } from '@stump/client'
import { graphql, SeriesOverviewSheetQuery } from '@stump/graphql'
import { useQueryClient } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { forwardRef, useMemo } from 'react'
import { View } from 'react-native'
import { ScrollView } from 'react-native-gesture-handler'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { IS_IOS_24_PLUS, useColors } from '~/lib/constants'
import { formatBytes } from '~/lib/format'

import { InfoRow, LongValue, MetadataBadgeSection } from '../overview'
import { InfoStat } from '../stats'
import { Card, CardList, Heading, Text } from '../ui'

const query = graphql(`
	query SeriesOverviewSheet($id: ID!) {
		seriesById(id: $id) {
			resolvedName
			metadata {
				ageRating
				booktype
				characters
				collects {
					series
					comicid
					issueid
					issues
				}
				comicImage
				comicid
				descriptionFormatted
				genres
				imprint
				links
				metaType
				publicationRun
				publisher
				status
				summary
				title
				totalIssues
				volume
				writers
				year
			}
			stats {
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

export const usePrefetchSeriesOverview = () => {
	const client = useQueryClient()
	const { sdk } = useSDK()
	return (id: string) =>
		client.prefetchQuery({
			queryKey: sdk.cacheKey('seriesById', ['overviewSheet', id]),
			queryFn: () => sdk.execute(query, { id }),
			staleTime: PREFETCH_STALE_TIME,
		})
}

type Props = {
	seriesId: string
}

export const SeriesOverviewSheet = forwardRef<TrueSheet, Props>(({ seriesId }, ref) => {
	const { sdk } = useSDK()
	const {
		data: { seriesById: series },
	} = useSuspenseGraphQL(query, sdk.cacheKey('seriesById', ['overviewSheet', seriesId]), {
		id: seriesId,
	})

	const colors = useColors()
	const insets = useSafeAreaInsets()

	if (!series) {
		return null
	}

	return (
		<TrueSheet
			ref={ref}
			detents={[0.65, 1]}
			dimmed={false}
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
			<SheetContent series={series} />
		</TrueSheet>
	)
})
SeriesOverviewSheet.displayName = 'SeriesOverviewSheet'

type SheetContentProps = {
	series: NonNullable<SeriesOverviewSheetQuery['seriesById']>
}

function SheetContent({ series: { stats, metadata, resolvedName, tags } }: SheetContentProps) {
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

	const hasPublicationInfo =
		metadata?.publisher ||
		metadata?.imprint ||
		metadata?.publicationRun ||
		metadata?.status ||
		metadata?.booktype ||
		metadata?.year ||
		metadata?.volume ||
		metadata?.totalIssues

	const hasDetails = metadata?.ageRating || metadata?.metaType

	const hasAbout = metadata?.summary || metadata?.descriptionFormatted

	return (
		<ScrollView className="flex-1 p-6" nestedScrollEnabled>
			<View className="gap-8">
				<View>
					<Heading size="2xl" numberOfLines={3}>
						{resolvedName}
					</Heading>

					{tags.length > 0 && (
						<View className="mt-4 flex flex-row flex-wrap gap-3">
							{tags.map((tag) => (
								<Text key={tag.name} className="text-foreground-muted">
									#{tag.name}
								</Text>
							))}
						</View>
					)}
				</View>

				<Card label="Stats" className="flex flex-row flex-wrap justify-around gap-x-6 gap-y-4">
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

				{hasAbout && (
					<CardList label="About">
						{metadata?.summary && <LongValue label="Summary" value={metadata.summary} />}
						{metadata?.descriptionFormatted && !metadata?.summary && (
							<LongValue label="Description" value={metadata.descriptionFormatted} />
						)}
					</CardList>
				)}

				{hasPublicationInfo && (
					<CardList label="Publication">
						{metadata?.publisher && <InfoRow label="Publisher" value={metadata.publisher} />}
						{metadata?.imprint && <InfoRow label="Imprint" value={metadata.imprint} />}
						{metadata?.publicationRun && (
							<InfoRow label="Publication Run" value={metadata.publicationRun} />
						)}
						{metadata?.status && <InfoRow label="Status" value={metadata.status} />}
						{metadata?.booktype && <InfoRow label="Book Type" value={metadata.booktype} />}
						{metadata?.year && <InfoRow label="Year" value={metadata.year.toString()} />}
						{metadata?.volume && <InfoRow label="Volume" value={metadata.volume.toString()} />}
						{metadata?.totalIssues && (
							<InfoRow label="Total Issues" value={metadata.totalIssues.toString()} />
						)}
					</CardList>
				)}

				{hasDetails && (
					<CardList label="Details">
						{metadata?.ageRating && (
							<InfoRow label="Age Rating" value={metadata.ageRating.toString()} />
						)}
						{metadata?.metaType && <InfoRow label="Type" value={metadata.metaType} />}
					</CardList>
				)}

				<MetadataBadgeSection label="Genres" items={metadata?.genres ?? []} />
				<MetadataBadgeSection label="Writers" items={metadata?.writers ?? []} />
				<MetadataBadgeSection label="Characters" items={metadata?.characters ?? []} />
			</View>
		</ScrollView>
	)
}
