import { TrueSheet } from '@lodev09/react-native-true-sheet'
import { PREFETCH_STALE_TIME, useSDK, useSuspenseGraphQL } from '@stump/client'
import { graphql, SeriesOverviewSheetQuery } from '@stump/graphql'
import { formatHumanDuration } from '@stump/i18n'
import { useQueryClient } from '@tanstack/react-query'
import { forwardRef } from 'react'
import { View } from 'react-native'
import { ScrollView } from 'react-native-gesture-handler'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { IS_IOS_24_PLUS, useColors } from '~/lib/constants'
import { formatBytesSeparate } from '~/lib/format'

import { InfoRow, LongValue, MetadataBadgeSection } from '../overview'
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

	const colors = useColors()
	const insets = useSafeAreaInsets()

	if (!series) {
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
			<SheetContent series={series} />
		</TrueSheet>
	)
})
SeriesOverviewSheet.displayName = 'SeriesOverviewSheet'

type SheetContentProps = {
	series: NonNullable<SeriesOverviewSheetQuery['seriesById']>
}

function SheetContent({ series: { stats, metadata, resolvedName, tags } }: SheetContentProps) {
	const formattedSize = formatBytesSeparate(stats.totalBytes)
	const formattedTime = formatHumanDuration(stats.totalReadingTimeSeconds, { significantUnits: 1 })

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
		<ScrollView className="flex-1 px-4 py-6" nestedScrollEnabled>
			<View className="gap-6">
				<View className="px-2">
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

				<Card label="Stats">
					<Card.StatGroup>
						<Card.Stat label="In Progress" value={stats.inProgressBooks} />
						<Card.Stat
							label="Completed"
							value={stats.completedBooks}
							suffix={` / ${stats.bookCount}`}
						/>
						<Card.Stat label="Books" value={stats.bookCount} />
						<Card.Stat label="Reading Time" value={formattedTime} />
						<Card.Stat
							label="Size"
							value={formattedSize?.value || 'Unknown'}
							suffix={formattedSize?.unit && ` ${formattedSize?.unit}`}
						/>
					</Card.StatGroup>
				</Card>

				{hasAbout && (
					<Card label="About" className="px-6">
						{metadata?.summary && <LongValue label="Summary" value={metadata.summary} />}
						{metadata?.descriptionFormatted && !metadata?.summary && (
							<LongValue label="Description" value={metadata.descriptionFormatted} />
						)}
					</Card>
				)}

				{hasPublicationInfo && (
					<Card label="Publication" className="px-6">
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
					</Card>
				)}

				{hasDetails && (
					<Card label="Details" className="px-6">
						{metadata?.ageRating && (
							<InfoRow label="Age Rating" value={metadata.ageRating.toString()} />
						)}
						{metadata?.metaType && <InfoRow label="Type" value={metadata.metaType} />}
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
