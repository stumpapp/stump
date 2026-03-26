import { TrueSheet } from '@lodev09/react-native-true-sheet'
import { MediaMetadata } from '@stump/graphql'
import { formatHumanDuration } from '@stump/i18n'
import { intlFormat } from 'date-fns'
import { forwardRef, useMemo } from 'react'
import { Platform, View } from 'react-native'
import Animated from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import TImage from 'react-native-turbo-image'

import { epubProgress, imageMeta } from '~/db'
import { formatSeriesPosition } from '~/lib/bookUtils'
import { useColors } from '~/lib/constants'
import { formatBytes } from '~/lib/format'
import { usePreferencesStore } from '~/stores'

import { DescriptionSection, InfoRow, useOverviewAnimations } from '../book/overview'
import { ThumbnailImage } from '../image'
import { MetadataBadgeSection } from '../overview'
import { Card, Heading, Text } from '../ui'
import { DownloadedFile } from './types'
import { getThumbnailPath } from './utils'

type Props = {
	downloadedFile: DownloadedFile
}

// TODO: Take the patterns which I copied here from books/[id]/index.tsx and make reusable
// overview components, instead, instead of being :sparkles: l a z y :sparkles:
export const DownloadedBookDetailsSheet = forwardRef<TrueSheet, Props>(
	function DownloadedBookDetailsSheet({ downloadedFile }, ref) {
		const colors = useColors()
		const insets = useSafeAreaInsets()
		const thumbnailRatio = usePreferencesStore((state) => state.thumbnailRatio)

		const thumbnailData = useMemo(
			() => imageMeta.safeParse(downloadedFile.thumbnailMeta).data,
			[downloadedFile.thumbnailMeta],
		)

		const readProgressData = downloadedFile.readProgress
		const epubProgressData = useMemo(
			() => epubProgress.safeParse(readProgressData?.epubProgress).data,
			[readProgressData?.epubProgress],
		)

		const metadata = downloadedFile.bookMetadata as Partial<MediaMetadata> | undefined

		const formattedSize = downloadedFile.size ? formatBytes(downloadedFile.size) : null
		const pages = downloadedFile.pages && downloadedFile.pages > 0 ? downloadedFile.pages : null
		const extension = downloadedFile.filename.split('.').pop()?.toUpperCase() || null

		const publisher = metadata?.publisher
		const seriesVolume = metadata?.volume
		const year = metadata?.year
		const genres = metadata?.genres || []
		const description = downloadedFile.bookDescription || metadata?.summary || ''

		const seriesName = metadata?.series || downloadedFile.series?.name
		const seriesPosition = formatSeriesPosition(
			(Number(metadata?.number) || undefined) ?? null,
			// We don't have totalBooks offline, pass 0 so it always shows "X in Series"
			0,
			{ seriesName: seriesName ?? null },
		)

		const getProgressPercentage = () => {
			if (!readProgressData) return null

			const currentPage = readProgressData.page || 0
			const totalPages = pages || -1
			if (totalPages > 0 && currentPage > 0) {
				return Math.min((currentPage / totalPages) * 100, 100)
			}

			if (readProgressData.percentage) {
				const parsed = parseFloat(readProgressData.percentage)
				if (!isNaN(parsed)) {
					return Math.min(parsed * 100, 100)
				}
			}

			return null
		}

		const progressPercentage = getProgressPercentage()

		const readTime = useMemo(() => {
			if (!readProgressData?.elapsedSeconds) return null
			return formatHumanDuration(readProgressData.elapsedSeconds)
		}, [readProgressData])

		const thumbnailUri = getThumbnailPath(downloadedFile)

		const { animatedScrollRef, parallaxStyle } = useOverviewAnimations()

		const showDetails =
			formattedSize ||
			extension ||
			metadata?.language ||
			(metadata?.ageRating && metadata.ageRating > 0) ||
			downloadedFile.downloadedAt

		return (
			<TrueSheet
				ref={ref}
				detents={[1]}
				cornerRadius={24}
				grabber
				scrollable
				backgroundColor={colors.sheet.background}
				grabberOptions={{
					color: colors.sheet.grabber,
				}}
				style={{
					paddingBottom: insets.bottom,
				}}
			>
				<Animated.ScrollView ref={animatedScrollRef}>
					<View className="overflow-hidden pb-16">
						{thumbnailUri && (
							<Animated.View
								className="absolute -inset-12 opacity-70 dark:opacity-30"
								style={parallaxStyle}
							>
								<TImage
									source={{ uri: thumbnailUri }}
									style={{ width: '100%', height: '100%' }}
									resizeMode="cover"
									fadeDuration={2000}
									{...(Platform.OS === 'ios' && { indicator: { color: 'transparent' } })}
									resize={60}
									blur={Platform.OS === 'ios' ? 7 : 16}
								/>
							</Animated.View>
						)}

						<View className="items-center gap-4 px-4 pb-8 pt-8">
							<ThumbnailImage
								source={{
									// @ts-expect-error: URI doesn't like undefined but it shows a placeholder when undefined
									uri: thumbnailUri,
								}}
								resizeMode="cover"
								size={{ height: 200 / thumbnailRatio, width: 200 }}
								placeholderData={thumbnailData}
								borderAndShadowStyle={{ shadowRadius: 5 }}
							/>

							<View className="gap-1">
								<Heading size="lg" className="text-center leading-6" numberOfLines={3}>
									{downloadedFile.bookName || 'Untitled'}
								</Heading>

								{seriesPosition != null ? (
									<Text className="text-center text-base text-foreground-muted" numberOfLines={1}>
										{seriesPosition}
									</Text>
								) : (
									downloadedFile.series && (
										<Text className="text-center text-base text-foreground-muted" numberOfLines={1}>
											{downloadedFile.series.name}
										</Text>
									)
								)}

								{downloadedFile.library && (
									<Text className="text-center text-sm text-foreground-muted" numberOfLines={1}>
										{downloadedFile.library.name}
									</Text>
								)}
							</View>
						</View>
					</View>

					<View className="ios:rounded-[3rem] ios:-mt-[4.5rem] -mt-[2.5rem] gap-4 rounded-[2.5rem] bg-background px-4 py-6">
						<Card>
							<Card.StatGroup>
								{pages && <Card.Stat label="Pages" value={pages} />}
								{epubProgressData?.chapterTitle &&
									!epubProgressData.chapterTitle.match(/\.(html|xml|xhtml)$/i) && (
										<Card.Stat label="Chapter" value={epubProgressData.chapterTitle} />
									)}
								{progressPercentage != null && (
									<Card.Stat
										label="Progress"
										value={`${progressPercentage.toFixed(1)}`}
										suffix={'%'}
									/>
								)}
								{readTime && <Card.Stat label="Read time" value={readTime} />}
							</Card.StatGroup>
						</Card>

						{!!description && <DescriptionSection description={description} />}

						<Card>
							<Card.StatGroup>
								{!!publisher && <Card.Stat label="Publisher" value={publisher} />}
								{!!seriesVolume && <Card.Stat label="Volume" value={seriesVolume} />}
								{year != null && year > 0 && <Card.Stat label="Year" value={year} />}
								{pages && <Card.Stat label="Pages" value={pages} />}
							</Card.StatGroup>
						</Card>

						<MetadataBadgeSection
							label="Genres"
							items={genres.map((genre) => ({ label: genre }))}
						/>

						{showDetails && (
							<Card label="Details">
								{extension && <InfoRow label="Format" value={extension} />}
								{!!formattedSize && <InfoRow label="Size" value={formattedSize} />}
								{metadata?.language && <InfoRow label="Language" value={metadata.language} />}
								{metadata?.ageRating != null && metadata.ageRating > 0 && (
									<InfoRow label="Age Rating" value={`${metadata.ageRating}+`} />
								)}
								{downloadedFile.downloadedAt && (
									<InfoRow
										label="Downloaded"
										value={intlFormat(new Date(downloadedFile.downloadedAt), {
											month: 'long',
											day: 'numeric',
											year: 'numeric',
										})}
									/>
								)}
							</Card>
						)}
					</View>
				</Animated.ScrollView>
			</TrueSheet>
		)
	},
)
