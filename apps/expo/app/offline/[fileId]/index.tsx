import { MediaMetadata } from '@stump/graphql'
import { formatHumanDuration } from '@stump/i18n'
import { intlFormat } from 'date-fns'
import { eq } from 'drizzle-orm'
import { useLiveQuery } from 'drizzle-orm/expo-sqlite'
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router'
import { useCallback, useMemo } from 'react'
import { Platform, View } from 'react-native'
import Animated from 'react-native-reanimated'
import TImage from 'react-native-turbo-image'
import { useShallow } from 'zustand/react/shallow'

import BackLink from '~/components/BackLink'
import { DescriptionSection, useOverviewAnimations } from '~/components/book/overview'
import { ThumbnailImage } from '~/components/image'
import { intoDownloadedFile } from '~/components/localLibrary'
import { useOfflineBookMenu } from '~/components/localLibrary/OfflineBookMenu'
import { useDownloadsState } from '~/components/localLibrary/store'
import { getThumbnailPath } from '~/components/localLibrary/utils'
import { MetadataBadgeSection } from '~/components/overview'
import { Button, Card, Heading, Text } from '~/components/ui'
import { Icon } from '~/components/ui/icon'
import {
	db,
	downloadedFiles,
	epubProgress,
	imageMeta,
	libraryRefs,
	readProgress,
	seriesRefs,
} from '~/db'
import { formatSeriesPosition } from '~/lib/bookUtils'
import { formatBytes } from '~/lib/format'
import { useTranslate } from '~/lib/hooks'
import { cn } from '~/lib/utils'
import { usePreferencesStore } from '~/stores'

// TODO: Take the patterns which I copied here from books/[id]/index.tsx and make reusable
// overview components, instead, instead of being :sparkles: l a z y :sparkles:
export default function Screen() {
	const { fileId } = useLocalSearchParams<{ fileId: string }>()
	const router = useRouter()
	const { t } = useTranslate()

	const thumbnailRatio = usePreferencesStore((state) => state.thumbnailRatio)
	const { fetchCounter, increment } = useDownloadsState(
		useShallow((state) => ({
			fetchCounter: state.fetchCounter,
			increment: state.increment,
		})),
	)

	useFocusEffect(
		useCallback(() => {
			increment()
		}, [increment]),
	)

	const {
		data: [record],
	} = useLiveQuery(
		db
			.select()
			.from(downloadedFiles)
			.leftJoin(readProgress, eq(downloadedFiles.id, readProgress.bookId))
			.leftJoin(seriesRefs, eq(downloadedFiles.seriesId, seriesRefs.id))
			.leftJoin(libraryRefs, eq(seriesRefs.libraryId, libraryRefs.id))
			.where(eq(downloadedFiles.id, fileId))
			.limit(1),
		[fileId, fetchCounter],
	)

	const downloadedFile = useMemo(() => {
		if (!record) return null
		return intoDownloadedFile(record)
	}, [record])

	const menuFragment = useOfflineBookMenu({ downloadedFile })

	const { animatedScrollRef, parallaxStyle } = useOverviewAnimations()

	if (!downloadedFile) return null

	const thumbnailUri = getThumbnailPath(downloadedFile)
	const thumbnailData = imageMeta.safeParse(downloadedFile.thumbnailMeta).data
	const readProgressData = downloadedFile.readProgress
	const epubProgressData = epubProgress.safeParse(readProgressData?.epubProgress).data

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

	const currentPage = readProgressData?.page ?? epubProgressData?.locations?.position ?? '??'
	const progressPercentage = getProgressPercentage()
	const readTime = readProgressData?.elapsedSeconds
		? formatHumanDuration(readProgressData.elapsedSeconds, { significantUnits: 1 })
		: null

	const showDetails =
		!!formattedSize ||
		!!extension ||
		!!metadata?.language ||
		(!!metadata?.ageRating && metadata.ageRating > 0) ||
		!!downloadedFile.downloadedAt

	const renderRead = () => {
		if (progressPercentage && progressPercentage > 0) {
			return <Text>Continue</Text>
		} else {
			return <Text>Read</Text>
		}
	}

	return (
		<>
			{menuFragment}
			<Animated.ScrollView className="flex-1 bg-background" ref={animatedScrollRef}>
				<View className="ios:pt-safe-offset-20 pt-safe ios:pb-24 pb-16 overflow-hidden">
					{thumbnailUri && (
						<Animated.View
							className="-inset-24 absolute opacity-70 dark:opacity-30"
							style={parallaxStyle}
						>
							<TImage
								source={{ uri: thumbnailUri }}
								style={{ width: '100%', height: '100%' }}
								resizeMode="cover"
								fadeDuration={2000}
								{...(Platform.OS === 'ios' && { indicator: { color: 'transparent' } })}
								resize={60}
								// android only supports up to blur={25} which doesn't look good,
								// but if we heavily downscale first, the following looks near identical to using
								// original res with blur={40} on ios, which is what I originally settled on
								blur={Platform.OS === 'ios' ? 7 : 16}
							/>
						</Animated.View>
					)}

					<View className="gap-6 px-4 tablet:px-6">
						{Platform.OS === 'android' && (
							<View className="pt-2 flex flex-row justify-between">
								<BackLink iconClassName="mr-[unset]" />
							</View>
						)}

						<ThumbnailImage
							source={{
								// @ts-expect-error: URI doesn't like undefined but it shows a placeholder when undefined
								uri: thumbnailUri,
							}}
							size={{ height: 235 / thumbnailRatio, width: 235 }}
							placeholderData={thumbnailData}
							borderAndShadowStyle={{ shadowRadius: 5 }}
						/>

						<View className="gap-1">
							<Heading size="lg" className="leading-6 text-center">
								{downloadedFile.bookName || t('common.unknownTitle')}
							</Heading>

							{seriesPosition != null ? (
								<Text className="text-base text-center text-foreground-muted">
									{seriesPosition}
								</Text>
							) : (
								downloadedFile.series && (
									<Text className="text-base text-center text-foreground-muted">
										{downloadedFile.series.name}
									</Text>
								)
							)}
							{downloadedFile.library && (
								<Text className="text-sm text-center text-foreground-muted" numberOfLines={1}>
									{downloadedFile.library.name}
								</Text>
							)}
						</View>

						<View className="gap-x-2 tablet:max-w-sm flex w-full flex-row items-center tablet:self-center">
							<Button
								className="flex-1"
								roundness="full"
								onPress={() => router.push(`/offline/${fileId}/read`)}
								variant="brand"
							>
								{renderRead()}
							</Button>
						</View>

						{(readProgressData || progressPercentage != null) && (
							<Card>
								{epubProgressData?.chapterTitle && (
									<Card.StatGroup>
										<Card.Stat label={t('common.chapter')} value={epubProgressData.chapterTitle} />
									</Card.StatGroup>
								)}
								<Card.StatGroup>
									{pages && <Card.Stat label="Page" value={currentPage} suffix={` / ${pages}`} />}

									{progressPercentage != null && (
										<Card.Stat
											label={t('common.progress')}
											value={progressPercentage.toFixed(0)}
											suffix={'%'}
										/>
									)}
									{readTime && <Card.Stat label={t('common.readTime')} value={readTime} />}
								</Card.StatGroup>
							</Card>
						)}
					</View>
				</View>

				<View className="squircle ios:rounded-[3rem] ios:-mt-[4.5rem] gap-8 px-4 py-6 tablet:px-6 -mt-[2.5rem] rounded-[2.5rem] bg-background">
					{!!description && <DescriptionSection description={description} />}

					<Card className={cn(!description && 'px-2')}>
						<Card.StatGroup>
							{!!publisher && <Card.Stat label={t('bookMetadata.publisher')} value={publisher} />}
							{!!seriesVolume && (
								<Card.Stat label={t('bookMetadata.volume')} value={seriesVolume} />
							)}
							{year != null && year > 0 && (
								<Card.Stat label={t('bookMetadata.year')} value={year} />
							)}
							{pages && <Card.Stat label={t('common.pages')} value={pages} />}
						</Card.StatGroup>
					</Card>

					<MetadataBadgeSection
						label={t('bookMetadata.genres')}
						items={genres.map((genre) => ({ label: genre }))}
					/>

					{showDetails && (
						<Card label={t('common.details')}>
							{extension && <Card.Row label={t('bookMetadata.format')} value={extension} />}
							{!!formattedSize && <Card.Row label={t('bookMetadata.size')} value={formattedSize} />}
							{metadata?.language && (
								<Card.Row label={t('bookMetadata.language')} value={metadata.language} />
							)}
							{metadata?.ageRating != null && metadata.ageRating > 0 && (
								<Card.Row label={t('bookMetadata.ageRating')} value={`${metadata.ageRating}+`} />
							)}
							{downloadedFile.downloadedAt && (
								<Card.Row
									label={t('bookMetadata.downloadedAt')}
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
		</>
	)
}
