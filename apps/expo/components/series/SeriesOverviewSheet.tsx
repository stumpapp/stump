import { TrueSheet } from '@lodev09/react-native-true-sheet'
import { PREFETCH_STALE_TIME, useSDK, useSuspenseGraphQL } from '@stump/client'
import { graphql, SeriesOverviewSheetQuery } from '@stump/graphql'
import { formatHumanDuration } from '@stump/i18n'
import { useQueryClient } from '@tanstack/react-query'
import { BookCheck, BookOpen, Clock, HardDrive, Library } from 'lucide-react-native'
import { forwardRef, useState } from 'react'
import { View } from 'react-native'
import { ScrollView } from 'react-native-gesture-handler'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { IS_IOS_24_PLUS, useColors } from '~/lib/constants'
import { formatBytesSeparate } from '~/lib/format'

import { useGridItemSize } from '../grid/useGridItemSize'
import { MetadataBadgeSection } from '../overview'
import { SheetBackDetection } from '../SheetBackDetection'
import { StatCard, StatCardProps } from '../StatCard'
import { Card, Heading, Text } from '../ui'

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
	const [isOpen, setIsOpen] = useState(false)

	const colors = useColors()
	const insets = useSafeAreaInsets()

	if (!series) {
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
				<SheetContent series={series} />
			</TrueSheet>

			{/*@ts-expect-error: it should be fine*/}
			{ref && <SheetBackDetection ref={ref} isOpen={isOpen} />}
		</>
	)
})
SeriesOverviewSheet.displayName = 'SeriesOverviewSheet'

type SheetContentProps = {
	series: NonNullable<SeriesOverviewSheetQuery['seriesById']>
}

function SheetContent({ series: { stats, metadata, resolvedName, tags } }: SheetContentProps) {
	const formattedSize = formatBytesSeparate(stats.totalBytes)
	const formattedTime = formatHumanDuration(stats.totalReadingTimeSeconds, { significantUnits: 1 })
	// hopefully suffix is okay for other languages
	const [, formattedTimeValue, formattedTimeUnit] = formattedTime.match(/^(\d+)\s*(.+)$/) || []

	const { itemWidth } = useGridItemSize({
		horizontalGap: 7, // gap-2 on grid = 7px
		padding: 42, // p-6 on sheet = 21px * 2 sides = 42px
	})

	const seriesStats = [
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
		<ScrollView className="p-6 flex-1" nestedScrollEnabled>
			<View className="gap-8">
				<View>
					<Heading size="2xl" numberOfLines={3}>
						{resolvedName}
					</Heading>

					{tags.length > 0 && (
						<View className="mt-4 gap-3 flex flex-row flex-wrap">
							{tags.map((tag) => (
								<Text key={tag.name} className="text-foreground-muted">
									#{tag.name}
								</Text>
							))}
						</View>
					)}
				</View>

				<View className="gap-2 flex-row flex-wrap justify-center">
					{seriesStats.map((stat, index) => (
						<StatCard key={index} {...stat} style={{ width: itemWidth }} />
					))}
				</View>

				{hasAbout && (
					<Card label="About" className="px-6">
						{metadata?.summary && <Card.LongRow label="Summary" value={metadata.summary} />}
						{metadata?.descriptionFormatted && !metadata?.summary && (
							<Card.LongRow label="Description" value={metadata.descriptionFormatted} />
						)}
					</Card>
				)}

				{hasPublicationInfo && (
					<Card label="Publication" className="px-6">
						{metadata?.publisher && <Card.Row label="Publisher" value={metadata.publisher} />}
						{metadata?.imprint && <Card.Row label="Imprint" value={metadata.imprint} />}
						{metadata?.publicationRun && (
							<Card.Row label="Publication Run" value={metadata.publicationRun} />
						)}
						{metadata?.status && <Card.Row label="Status" value={metadata.status} />}
						{metadata?.booktype && <Card.Row label="Book Type" value={metadata.booktype} />}
						{metadata?.year && <Card.Row label="Year" value={metadata.year.toString()} />}
						{metadata?.volume && <Card.Row label="Volume" value={metadata.volume.toString()} />}
						{metadata?.totalIssues && (
							<Card.Row label="Total Issues" value={metadata.totalIssues.toString()} />
						)}
					</Card>
				)}

				{hasDetails && (
					<Card label="Details" className="px-6">
						{metadata?.ageRating && (
							<Card.Row label="Age Rating" value={metadata.ageRating.toString()} />
						)}
						{metadata?.metaType && <Card.Row label="Type" value={metadata.metaType} />}
					</Card>
				)}

				<MetadataBadgeSection
					label="Genres"
					items={(metadata?.genres ?? []).map((genre) => ({ label: genre }))}
				/>
				<MetadataBadgeSection
					label="Writers"
					items={(metadata?.writers ?? []).map((writer) => ({ label: writer }))}
				/>
				<MetadataBadgeSection
					label="Characters"
					items={(metadata?.characters ?? []).map((character) => ({ label: character }))}
				/>
			</View>
		</ScrollView>
	)
}
