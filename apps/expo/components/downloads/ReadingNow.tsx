import { MediaMetadata } from '@stump/graphql'
import dayjs from 'dayjs'
import { useRouter } from 'expo-router'
import { useCallback, useMemo, useRef } from 'react'
import { Easing, Platform, Pressable, View } from 'react-native'
import { easeGradient } from 'react-native-easing-gradient'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import LinearGradient from 'react-native-linear-gradient'
import { useSharedValue } from 'react-native-reanimated'
import Carousel, { ICarouselInstance, Pagination } from 'react-native-reanimated-carousel'
import { scheduleOnRN } from 'react-native-worklets'
import { stripHtml } from 'string-strip-html'

import { BorderAndShadow } from '~/components/BorderAndShadow'
import { TurboImage } from '~/components/Image'
import { Heading, Progress, Text } from '~/components/ui'
import { syncStatus } from '~/db'
import { COLORS, useColors } from '~/lib/constants'
import { parseGraphQLDecimal } from '~/lib/format'
import { useDisplay } from '~/lib/hooks'
import { usePreferencesStore } from '~/stores'

import { BookMetaLink } from '../book'
import { SyncIcon } from './sync-icon/SyncIcon'
import { DownloadedFile } from './types'
import { getThumbnailPath } from './utils'

type Props = {
	books: DownloadedFile[]
}

const IMAGE_WIDTH = 280

export default function ReadingNow({ books }: Props) {
	const { width } = useDisplay()

	const colors = useColors()
	const carouselRef = useRef<ICarouselInstance>(null)
	const progressValue = useSharedValue<number>(0)
	const activeDotIndex = useSharedValue(-1) // -1 means inactive

	const thumbnailRatio = usePreferencesStore((state) => state.thumbnailRatio)
	const imageHeight = IMAGE_WIDTH / thumbnailRatio

	const onPressPagination = (index: number) => {
		carouselRef.current?.scrollTo({
			index: index,
			animated: true,
		})
	}

	const paginationDotsContainerWidth =
		books.length * 8 + // total width of all dots
		(books.length - 1) * 6 + // total gap between dots
		16 * 2 // container padding

	const pan = Gesture.Pan()
		.activeOffsetX([-3, 3])
		.failOffsetY([-6, 6])
		.onUpdate((event) => {
			const totalItems = books.length
			const activeAreaWidth = paginationDotsContainerWidth / totalItems
			const index = Math.min(totalItems - 1, Math.max(0, Math.floor(event.x / activeAreaWidth)))

			// only update onPressPagination when the index actually changes (not when same number due to tiny movements)
			if (activeDotIndex.value !== index) {
				activeDotIndex.value = index
				scheduleOnRN(onPressPagination, index)
			}
		})
		.onEnd(() => {
			activeDotIndex.value = -1
		})

	return (
		<View className="flex items-start gap-4">
			<View className="absolute left-0 top-0 z-30 w-[20px]" style={{ height: imageHeight + 8 }} />

			<View className="w-full">
				<Carousel
					ref={carouselRef}
					width={width}
					height={imageHeight + 8} // add some padding to not cut off the shadow
					data={books}
					loop={false}
					mode="parallax"
					modeConfig={{
						parallaxScrollingOffset: 95,
						parallaxScrollingScale: 1,
						parallaxAdjacentItemScale: 0.95,
					}}
					onProgressChange={progressValue}
					// Note: I added this to fix vertical scroll conflicts
					onConfigurePanGesture={(pan) => {
						pan.activeOffsetX([-6, 6])
						pan.failOffsetY([-12, 12])
						return pan
					}}
					snapEnabled={true}
					renderItem={({ item }) => (
						<View
							style={{
								flex: 1,
								justifyContent: 'center',
								paddingLeft: 16,
							}}
						>
							<ReadingNowItem book={item} />
						</View>
					)}
				/>

				<GestureDetector gesture={pan}>
					<View className="mx-auto flex-row">
						<Pagination.Custom
							progress={progressValue}
							data={books}
							dotStyle={{
								width: 8,
								height: 8,
								borderRadius: 4,
								backgroundColor: colors.dots.inactive,
							}}
							activeDotStyle={{
								backgroundColor: colors.dots.active,
							}}
							containerStyle={{
								padding: 16,
								gap: 6,
							}}
							onPress={onPressPagination}
						/>
					</View>
				</GestureDetector>
			</View>
		</View>
	)
}

type ReadingNowItemProps = {
	book: DownloadedFile
}

function ReadingNowItem({ book }: ReadingNowItemProps) {
	const { width, isTablet } = useDisplay()

	const percentageCompleted = parseGraphQLDecimal(book.readProgress?.percentage)
	const thumbnailRatio = usePreferencesStore((state) => state.thumbnailRatio)
	const imageHeight = IMAGE_WIDTH / thumbnailRatio

	// TODO: figure out why I need explicit widths for *each* elem
	const renderBookContent = useCallback(() => {
		if (!isTablet) return null

		const contentWidth =
			width -
			16 * 2 - // page padding
			IMAGE_WIDTH - // image width
			16 - // gap between image and text
			60 // gap between other carousel items

		const bookMetadata = book.bookMetadata as Partial<MediaMetadata> | undefined

		const description = stripHtml(bookMetadata?.summary || '').result
		const genres = bookMetadata?.genres?.map((genre) => `#${genre}`).join(', ')
		const links = bookMetadata?.links || []

		return (
			<View className="flex flex-col flex-wrap gap-2">
				<Heading
					style={{
						width: contentWidth,
					}}
				>
					{book.bookName}
				</Heading>

				{description && (
					<Text
						style={{
							width: contentWidth,
						}}
						numberOfLines={4}
					>
						{description}
					</Text>
				)}

				<View />
				<View />

				{genres && (
					<Text
						style={{
							width: contentWidth,
						}}
					>
						{genres}
					</Text>
				)}

				{links.length > 0 && (
					<View
						className="flex flex-row flex-wrap gap-2"
						style={{
							width: contentWidth,
						}}
					>
						{links.slice(0, 3).map((link) => (
							<BookMetaLink key={link} href={link} />
						))}
					</View>
				)}
			</View>
		)
	}, [isTablet, width, book])

	const thumbnailPath = useMemo(() => getThumbnailPath(book), [book])
	const status = useMemo(() => syncStatus.safeParse(book.readProgress?.syncStatus).data, [book])

	const router = useRouter()
	const isEbookProgress = !!book.readProgress?.epubProgress

	const { colors: gradientColors, locations: gradientLocations } = easeGradient({
		colorStops: {
			0.2: { color: 'rgba(0, 0, 0, 0.08)' }, // slight gradient at top for sync icon. Not sure how much it really helps
			0.5: { color: 'transparent' },
			1: { color: 'rgba(0, 0, 0, 0.90)' },
		},
		extraColorStopsPerTransition: 16,
		easing: Easing.bezier(0.42, 0, 1, 1), // https://cubic-bezier.com/#.42,0,1,1
	})

	const Gradient = () => (
		<LinearGradient
			colors={gradientColors}
			style={{
				position: 'absolute',
				inset: 0,
				zIndex: 10,
				borderRadius: Platform.OS === 'android' ? 12 : undefined,
			}}
			locations={gradientLocations}
		/>
	)

	return (
		<View className="flex flex-row gap-4">
			<Pressable onPress={() => router.push(`/offline/${book.id}/read`)}>
				{
					// Not ideal but stops carousel flickering on android.
					// Causes border to be covered by the gradient.
					Platform.OS === 'android' && <Gradient />
				}
				<BorderAndShadow
					style={{
						borderRadius: 12,
						borderWidth: 0.5,
						shadowRadius: 1.41,
						elevation: 2,
					}}
				>
					{Platform.OS !== 'android' && <Gradient />}

					<TurboImage
						source={{
							// @ts-expect-error: URI doesn't like undefined but it shows a placeholder when
							// undefined so it's fine
							uri: thumbnailPath,
						}}
						resizeMode="stretch"
						resize={IMAGE_WIDTH * 1.5}
						style={{
							height: imageHeight,
							width: IMAGE_WIDTH,
						}}
					/>
				</BorderAndShadow>

				{status && (
					<View className="absolute right-0 z-20 w-full items-end p-3 shadow">
						<SyncIcon status={status} size={24} />
					</View>
				)}

				<View className="absolute bottom-0 z-20 w-full gap-2 p-3">
					{!isTablet && (
						<Text
							className="text-2xl font-bold leading-8"
							style={{
								textShadowOffset: { width: 2, height: 1 },
								textShadowRadius: 2,
								textShadowColor: 'rgba(0, 0, 0, 0.5)',
								zIndex: 20,
								color: COLORS.dark.foreground.DEFAULT,
							}}
						>
							{book.bookName}
						</Text>
					)}

					<View className="flex items-start gap-2">
						<View className="flex w-full flex-row items-center justify-between">
							{!isEbookProgress && !!book.readProgress?.page && book.readProgress.page > 0 && (
								<Text
									className="flex-wrap text-base"
									style={{
										color: COLORS.dark.foreground.subtle,
										opacity: 0.9,
									}}
								>
									Page {book.readProgress?.page} of {book.pages}
								</Text>
							)}

							{isEbookProgress && percentageCompleted != null && (
								<Text
									className="flex-wrap text-base"
									style={{
										color: COLORS.dark.foreground.subtle,
										opacity: 0.9,
									}}
								>
									{(percentageCompleted * 100).toFixed(0)}%
								</Text>
							)}

							{!!book.readProgress?.lastModified && (
								<Text
									className="flex-wrap text-base"
									style={{
										color: COLORS.dark.foreground.subtle,
										opacity: 0.9,
									}}
								>
									{dayjs(book.readProgress?.lastModified).fromNow()}
								</Text>
							)}
						</View>

						{percentageCompleted && (
							<Progress
								className="h-1 bg-[#898d94]"
								indicatorClassName="bg-[#f5f3ef]"
								value={percentageCompleted * 100}
							/>
						)}
					</View>
				</View>
			</Pressable>

			{renderBookContent()}
		</View>
	)
}
