import { TrueSheet } from '@lodev09/react-native-true-sheet'
import dayjs from 'dayjs'
import duration from 'dayjs/plugin/duration'
import { forwardRef, useMemo } from 'react'
import { View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { stripHtml } from 'string-strip-html'

import { epubProgress, imageMeta } from '~/db'
import { useColors } from '~/lib/constants'
import { formatBytes } from '~/lib/format'

import { InfoRow, InfoStat, LongValue } from '../book/overview'
import { ThumbnailImage } from '../image'
import { CardList, Heading, Text } from '../ui'
import { DownloadedFile } from './types'
import { getThumbnailPath } from './utils'

dayjs.extend(duration)

type Props = {
	downloadedFile: DownloadedFile
}

export const DownloadedBookDetailsSheet = forwardRef<TrueSheet, Props>(
	function DownloadedBookDetailsSheet({ downloadedFile }, ref) {
		const colors = useColors()
		const insets = useSafeAreaInsets()

		const thumbnailData = useMemo(
			() => imageMeta.safeParse(downloadedFile.thumbnailMeta).data,
			[downloadedFile.thumbnailMeta],
		)

		const readProgressData = downloadedFile.readProgress
		const epubProgressData = useMemo(
			() => epubProgress.safeParse(readProgressData?.epubProgress).data,
			[readProgressData?.epubProgress],
		)

		const formattedSize = downloadedFile.size ? formatBytes(downloadedFile.size) : null
		const pages = downloadedFile.pages && downloadedFile.pages > 0 ? downloadedFile.pages : null

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
			return dayjs.duration(readProgressData.elapsedSeconds, 'seconds').humanize()
		}, [readProgressData])

		// TODO: Consider more metadata fields

		return (
			<TrueSheet
				ref={ref}
				detents={['auto', 1]}
				cornerRadius={24}
				grabber
				scrollable
				backgroundColor={colors.sheet.background}
				grabberOptions={{
					color: colors.sheet.grabber,
				}}
				style={{
					paddingTop: 12,
					paddingBottom: insets.bottom,
				}}
			>
				<View className="flex-1 gap-4 px-4 pb-4">
					<View className="flex-row gap-4">
						<ThumbnailImage
							source={{
								// @ts-expect-error: URI doesn't like undefined but it shows a placeholder when undefined
								uri: getThumbnailPath(downloadedFile),
							}}
							resizeMode="cover"
							size={{ height: 160, width: 110 }}
							placeholderData={thumbnailData}
						/>

						<View className="flex-1 justify-center gap-1">
							<Heading size="lg" numberOfLines={3}>
								{downloadedFile.bookName || 'Untitled'}
							</Heading>

							{downloadedFile.series && (
								<Text className="text-foreground-muted" numberOfLines={1}>
									{downloadedFile.series.name}
								</Text>
							)}

							{downloadedFile.library && (
								<Text className="text-sm text-foreground-muted" numberOfLines={1}>
									{downloadedFile.library.name}
								</Text>
							)}
						</View>
					</View>

					<View className="flex-row justify-around py-2">
						{formattedSize && <InfoStat label="Size" value={formattedSize} />}
						{pages && <InfoStat label="Pages" value={String(pages)} />}
						{progressPercentage != null && (
							<InfoStat label="Progress" value={`${progressPercentage.toFixed(0)}%`} />
						)}
						{readTime && <InfoStat label="Read time" value={readTime} />}
					</View>

					<CardList>
						{downloadedFile.bookDescription && (
							<LongValue
								label="Description"
								value={stripHtml(downloadedFile.bookDescription).result}
							/>
						)}

						{epubProgressData?.chapterTitle &&
							!epubProgressData.chapterTitle.match(/\.(html|xml|xhtml)$/i) && (
								<InfoRow label="Chapter" value={epubProgressData.chapterTitle} />
							)}

						{downloadedFile.series && <InfoRow label="Series" value={downloadedFile.series.name} />}

						{downloadedFile.library && (
							<InfoRow label="Library" value={downloadedFile.library.name} />
						)}

						{readProgressData?.page && pages && (
							<InfoRow label="Current Page" value={`${readProgressData.page} of ${pages}`} />
						)}

						{downloadedFile.downloadedAt && (
							<InfoRow
								label="Downloaded"
								value={new Date(downloadedFile.downloadedAt).toLocaleDateString()}
							/>
						)}
					</CardList>
				</View>
			</TrueSheet>
		)
	},
)
