import { formatBytes } from '@stump/client'
import { MediaMetadata } from '@stump/graphql'
import { eq } from 'drizzle-orm'
import { useLiveQuery } from 'drizzle-orm/expo-sqlite'
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router'
import { useCallback, useMemo, useState } from 'react'
import { Platform, View } from 'react-native'
import Animated from 'react-native-reanimated'
import { useShallow } from 'zustand/react/shallow'

import BackLink from '~/components/BackLink'
import {
	CurrentProgressCard,
	DescriptionSection,
	DetailsCard,
	getPercentage,
	OverviewBackground,
	ProminentMetadataCard,
	TitleSection,
	useOverviewAnimations,
} from '~/components/book/overview'
import { ThumbnailImage } from '~/components/image'
import { intoDownloadedFile } from '~/components/localLibrary'
import { useOfflineBookMenu } from '~/components/localLibrary/OfflineBookMenu'
import { useDownloadsState } from '~/components/localLibrary/store'
import { getThumbnailPath } from '~/components/localLibrary/utils'
import { MetadataBadgeSection } from '~/components/overview'
import { Button, Text } from '~/components/ui'
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
	const [mainSectionHeight, setMainSectionHeight] = useState<number>()

	if (!downloadedFile) return null

	const thumbnailUri = getThumbnailPath(downloadedFile)
	const thumbnailData = imageMeta.safeParse(downloadedFile.thumbnailMeta).data
	const readProgressData = downloadedFile.readProgress
	const epubProgressData = epubProgress.safeParse(readProgressData?.epubProgress).data

	const metadata = downloadedFile.bookMetadata as Partial<MediaMetadata> | undefined

	const formattedSize = downloadedFile.size ? formatBytes(downloadedFile.size) : null
	const extension = downloadedFile.filename.split('.').pop()?.toUpperCase() || null

	const publisher = metadata?.publisher
	const seriesVolume = metadata?.volume
	const year = metadata?.year
	const genres = metadata?.genres || []
	const description = downloadedFile.bookDescription || metadata?.summary || ''

	const seriesName = metadata?.series || downloadedFile.series?.name
	const seriesPosition = formatSeriesPosition(
		(Number(metadata?.number) || undefined) ?? null,
		// We don't have totalBooks offline, pass 0 so it always shows "Book X in Series"
		0,
		{
			seriesName: seriesName ?? null,
			t,
		},
	)

	const currentPage = readProgressData?.page ?? epubProgressData?.locations?.position
	const pages = downloadedFile.pages && downloadedFile.pages > 0 ? downloadedFile.pages : null
	const progressPercentage = getPercentage({ readProgress: readProgressData, totalPages: pages })

	const renderRead = () => {
		if (progressPercentage && progressPercentage > 0) {
			return <Text>{t('common.continue')}</Text>
		} else {
			return <Text>{t('common.read')}</Text>
		}
	}

	return (
		<>
			{menuFragment}

			{thumbnailUri && (
				<OverviewBackground
					source={{ uri: thumbnailUri }}
					parallaxStyle={parallaxStyle}
					mainSectionHeight={mainSectionHeight}
				/>
			)}

			<Animated.ScrollView
				className="flex-1"
				ref={animatedScrollRef}
				contentInsetAdjustmentBehavior="automatic"
			>
				<View
					className="gap-6 px-4 tablet:px-6 ios:pb-24 pb-16"
					onLayout={(e) => setMainSectionHeight(e.nativeEvent.layout.height)}
				>
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

					<TitleSection
						title={downloadedFile.bookName}
						series={seriesPosition ? seriesPosition : downloadedFile.series?.name}
						library={downloadedFile.library?.name}
					/>

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

					<CurrentProgressCard
						hidden={!readProgressData}
						showChapterTitle={!!epubProgressData}
						progressData={{
							chapterTitle: epubProgressData?.chapterTitle,
							page: currentPage,
							totalPages: pages,
							percentage: progressPercentage,
							readingTimeSeconds: readProgressData?.elapsedSeconds,
							// TODO: This seems to take download time as initial last modified
							lastRead: readProgressData?.lastModified,
						}}
					/>
				</View>

				<View className="squircle ios:rounded-[3rem] ios:-mt-[4.5rem] gap-8 px-4 py-6 tablet:px-6 -mt-[2.5rem] rounded-[2.5rem] bg-background">
					{!!description && <DescriptionSection description={description} />}

					<ProminentMetadataCard
						className={cn(!description && 'px-2')}
						metadata={{ publisher: publisher, volume: seriesVolume, year: year, pages: pages }}
					/>

					<MetadataBadgeSection
						label={t('bookMetadata.genres')}
						items={genres.map((genre) => ({ label: genre }))}
					/>

					<DetailsCard
						metadata={{
							extension: extension,
							size: formattedSize,
							language: metadata?.language,
							ageRating: metadata?.ageRating,
							downloadedAt: downloadedFile.downloadedAt,
						}}
					/>
				</View>
			</Animated.ScrollView>
		</>
	)
}
