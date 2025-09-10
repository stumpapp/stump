import { useSDK } from '@stump/client'
import { FragmentType, graphql, useFragment } from '@stump/graphql'
import dayjs from 'dayjs'
import { useRouter } from 'expo-router'
import { useCallback, useRef } from 'react'
import { Easing, Pressable, View } from 'react-native'
import { easeGradient } from 'react-native-easing-gradient'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import LinearGradient from 'react-native-linear-gradient'
import { runOnJS, useSharedValue } from 'react-native-reanimated'
import Carousel, { ICarouselInstance, Pagination } from 'react-native-reanimated-carousel'

import { BookMetaLink } from '~/components/book'
import { FasterImage } from '~/components/Image'
import { Heading, Progress, Text } from '~/components/ui'
import { COLORS, useColors } from '~/lib/constants'
import { parseGraphQLDecimal } from '~/lib/format'
import { useDisplay } from '~/lib/hooks'

import { useActiveServer } from '../context'

const fragment = graphql(`
	fragment ReadingNow on Media {
		id
		resolvedName
		metadata {
			summary
			genres
			links
		}
		thumbnail {
			url
		}
		pages
		readProgress {
			epubcfi
			page
			percentageCompleted
			updatedAt
		}
	}
`)

export type IReadingNowFragment = FragmentType<typeof fragment>

type Props = {
	books: (IReadingNowFragment & { id: string })[]
}

const IMAGE_HEIGHT = 425
const IMAGE_WIDTH = IMAGE_HEIGHT * (2 / 3)

export default function ReadingNow({ books }: Props) {
	const { width } = useDisplay()

	const colors = useColors()
	const carouselRef = useRef<ICarouselInstance>(null)
	const progressValue = useSharedValue<number>(0)
	const activeDotIndex = useSharedValue(-1) // -1 means inactive

	const onPressPagination = (index: number) => {
		carouselRef.current?.scrollTo({
			count: index - progressValue.value,
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
				runOnJS(onPressPagination)(index)
			}
		})
		.onEnd(() => {
			activeDotIndex.value = -1
		})

	return (
		<View className="mb-[-16px] flex items-start gap-4">
			{/* <Heading size="xl">Jump Back In</Heading> */}

			{/* This view prevents the left 20px of the carousel from overriding swipe back navigation */}
			<View className="absolute left-0 top-0 z-30 w-[20px]" style={{ height: IMAGE_HEIGHT }} />

			<View className="w-full">
				<Carousel
					ref={carouselRef}
					width={width}
					height={IMAGE_HEIGHT}
					data={books}
					loop={false}
					mode="parallax"
					modeConfig={{
						parallaxScrollingOffset: 95,
						parallaxScrollingScale: 0.99,
						parallaxAdjacentItemScale: 0.94,
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
	book: IReadingNowFragment
}

function ReadingNowItem({ book }: ReadingNowItemProps) {
	const data = useFragment(fragment, book)
	const {
		activeServer: { id: serverID },
	} = useActiveServer()
	const { sdk } = useSDK()
	const { width, isTablet } = useDisplay()

	const percentageCompleted = parseGraphQLDecimal(data.readProgress?.percentageCompleted)

	// TODO: figure out why I need explicit widths for *each* elem
	const renderBookContent = useCallback(() => {
		if (!isTablet) return null

		const contentWidth =
			width -
			16 * 2 - // page padding
			IMAGE_WIDTH - // image width
			16 - // gap between image and text
			60 // gap between other carousel items

		const description = data.metadata?.summary || ''
		const genres = data.metadata?.genres?.map((genre) => `#${genre}`).join(', ')
		const links = data.metadata?.links || []

		return (
			<View className="flex flex-col flex-wrap gap-2">
				<Heading
					style={{
						width: contentWidth,
					}}
				>
					{data.resolvedName}
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
	}, [isTablet, width, data])

	const router = useRouter()
	const isEbookProgress = !!data.readProgress?.epubcfi
	const { colors: gradientColors, locations: gradientLocations } = easeGradient({
		colorStops: {
			0.5: { color: 'transparent' },
			1: { color: 'rgba(0, 0, 0, 0.90)' },
		},
		extraColorStopsPerTransition: 16,
		easing: Easing.bezier(0.42, 0, 1, 1), // https://cubic-bezier.com/#.42,0,1,1
	})

	return (
		<View className="flex flex-row gap-4">
			<Pressable
				className="relative aspect-[2/3] shrink-0 rounded-lg"
				onPress={() => router.navigate(`/server/${serverID}/books/${data.id}`)}
				style={{
					shadowColor: '#000',
					shadowOffset: { width: 0, height: 1 },
					shadowOpacity: 0.2,
					shadowRadius: 1.41,
				}}
			>
				<LinearGradient
					colors={gradientColors}
					style={{ position: 'absolute', inset: 0, zIndex: 10, borderRadius: 8 }}
					locations={gradientLocations}
				/>

				<FasterImage
					source={{
						url: data.thumbnail.url,
						headers: {
							Authorization: sdk.authorizationHeader || '',
						},
						resizeMode: 'fill',
						borderRadius: 8,
					}}
					style={{
						height: IMAGE_HEIGHT,
						width: IMAGE_WIDTH,
					}}
				/>

				<View className="absolute bottom-0 z-20 w-full gap-2 p-2">
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
							{data.resolvedName}
						</Text>
					)}

					<View className="flex items-start gap-2">
						<View className="flex w-full flex-row items-center justify-between">
							{!isEbookProgress && !!data.readProgress?.page && data.readProgress.page > 0 && (
								<Text
									className="flex-wrap text-base"
									style={{
										color: COLORS.dark.foreground.subtle,
										opacity: 0.9,
									}}
								>
									Page {data.readProgress?.page} of {data.pages}
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

							{!!data.readProgress?.updatedAt && (
								<Text
									className="flex-wrap text-base"
									style={{
										color: COLORS.dark.foreground.subtle,
										opacity: 0.9,
									}}
								>
									{dayjs(data.readProgress?.updatedAt).fromNow()}
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
