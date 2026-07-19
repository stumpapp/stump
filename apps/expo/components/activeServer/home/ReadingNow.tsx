import { useSDK } from '@stump/client'
import { parseGraphQLPercentageDecimal } from '@stump/client'
import {
	FragmentType,
	graphql,
	MediaFilterInput,
	MediaMetadataFilterInput,
	useFragment,
} from '@stump/graphql'
import { formatDistanceToNow } from 'date-fns'
import { BlurTargetView } from 'expo-blur'
import { useRouter } from 'expo-router'
import { useRef } from 'react'
import { Easing, Pressable, View } from 'react-native'
import { easeGradient } from 'react-native-easing-gradient'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import { useSharedValue } from 'react-native-reanimated'
import Carousel, { ICarouselInstance, Pagination } from 'react-native-reanimated-carousel'
import { scheduleOnRN } from 'react-native-worklets'
import { stripHtml } from 'string-strip-html'

import { ThumbnailImage } from '~/components/image'
import { Badge, Heading, Progress, Text } from '~/components/ui'
import { COLORS, useColors } from '~/lib/constants'
import { useDisplay, useTranslate } from '~/lib/hooks'
import { cn } from '~/lib/utils'
import { usePreferencesStore } from '~/stores'

import { useActiveServer } from '../context'

const fragment = graphql(`
	fragment ReadingNow on Media {
		id
		resolvedName
		metadata {
			summary
			genres
			links
			publisher
			year
		}
		thumbnail {
			url
			metadata {
				averageColor
				colors {
					color
					percentage
				}
				thumbhash
			}
			height
			width
		}
		pages
		readProgress {
			epubcfi
			page
			percentageCompleted
			updatedAt
			locator {
				locations {
					position
				}
			}
		}
	}
`)

export type IReadingNowFragment = FragmentType<typeof fragment>

type Props = {
	books: (IReadingNowFragment & { id: string })[]
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
		<View className="gap-4 flex items-start">
			{/* <Heading size="xl">Jump Back In</Heading> */}

			{/* This view prevents the left 20px of the carousel from overriding swipe back navigation */}
			<View className="left-0 top-0 absolute z-30 w-[20px]" style={{ height: imageHeight + 8 }} />

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
	book: IReadingNowFragment
}

function ReadingNowItem({ book }: ReadingNowItemProps) {
	const data = useFragment(fragment, book)
	const {
		activeServer: { id: serverID },
	} = useActiveServer()
	const { sdk } = useSDK()
	const { t } = useTranslate()
	const { width, isTablet } = useDisplay()

	const router = useRouter()
	const colors = useColors()

	const percentageCompleted = parseGraphQLPercentageDecimal(data.readProgress?.percentageCompleted)
	const currentPage =
		data.readProgress?.page ?? data.readProgress?.locator?.locations?.position ?? '??'

	const thumbnailRatio = usePreferencesStore((state) => state.thumbnailRatio)
	const imageHeight = IMAGE_WIDTH / thumbnailRatio

	const originalDimensions =
		data.thumbnail.width && data.thumbnail.height
			? { width: data.thumbnail.width, height: data.thumbnail.height }
			: null

	const onClickFilterField = (
		field: Exclude<keyof MediaMetadataFilterInput, '_or' | '_and' | '_not'>,
		value: string,
	) => {
		const filter = {
			metadata: {
				[field]: {
					// Note: Most of these are "arrays" stored as comma-separated string
					likeAnyOf: [value],
				},
			},
		} satisfies MediaFilterInput
		const filterString = JSON.stringify(filter)
		router.push({
			// @ts-expect-error: String path
			pathname: `/server/${serverID}/books?initialFilters=${filterString}`,
		})
	}

	// TODO: figure out why I need explicit widths for *each* elem
	const renderTabletContent = () => {
		if (!isTablet) return null

		const contentWidth =
			width -
			16 * 2 - // page padding
			IMAGE_WIDTH - // image width
			16 - // gap between image and text
			60 // gap between other carousel items

		const description = stripHtml(data.metadata?.summary || '').result
		const genresSlice = (data.metadata?.genres || []).slice(0, 4)

		const publisher = data.metadata?.publisher
		const year = data.metadata?.year

		// TODO(tablet): sort this out, could be better
		return (
			<View className="gap-4 flex flex-col flex-wrap">
				<Heading
					style={{
						width: contentWidth,
					}}
				>
					{data.resolvedName}
				</Heading>

				{(publisher || year) && (
					<View
						className="gap-2 flex flex-row flex-wrap items-center"
						style={{
							width: contentWidth,
						}}
					>
						{publisher && (
							<Badge
								style={{
									backgroundColor: colors.fill.brand.secondary,
								}}
							>
								<Text className="text-sm">{publisher}</Text>
							</Badge>
						)}

						{year && (
							<Badge>
								<Text className="text-sm">{year}</Text>
							</Badge>
						)}
					</View>
				)}

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

				{genresSlice.length > 0 && (
					<View
						className="gap-2 flex flex-row flex-wrap items-center"
						style={{
							width: contentWidth,
						}}
					>
						{genresSlice.map((genre, itemIndex) => (
							<Pressable
								key={`${genre}-${itemIndex}`}
								onPress={() => onClickFilterField('genres', genre)}
								disabled={!genre}
							>
								{({ pressed }) => (
									<Badge
										className={cn('bg-black/5 dark:bg-white/10', {
											'opacity-80': pressed,
										})}
									>
										<Text className="text-sm">{genre}</Text>
									</Badge>
								)}
							</Pressable>
						))}
					</View>
				)}
			</View>
		)
	}

	const { colors: gradientColors, locations: gradientLocations } = easeGradient({
		colorStops: {
			0.5: { color: 'transparent' },
			1: { color: 'rgba(0, 0, 0, 0.90)' },
		},
		extraColorStopsPerTransition: 16,
		easing: Easing.bezier(0.42, 0, 1, 1), // https://cubic-bezier.com/#.42,0,1,1
	})

	const { url: uri, metadata: placeholderData } = data.thumbnail

	const blurTargetRef = useRef<View>(null)

	return (
		<View className="gap-4 flex flex-row">
			<Pressable onPress={() => router.navigate(`/server/${serverID}/books/${data.id}`)}>
				<BlurTargetView ref={blurTargetRef}>
					<ThumbnailImage
						source={{
							uri,
							headers: {
								...sdk.customHeaders,
								Authorization: sdk.authorizationHeader || '',
							},
						}}
						size={{ height: imageHeight, width: IMAGE_WIDTH }}
						gradient={{ colors: gradientColors, locations: gradientLocations }}
						placeholderData={placeholderData}
						originalDimensions={originalDimensions}
					/>
				</BlurTargetView>

				<View className="bottom-0 gap-2 p-3 absolute z-20 w-full">
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

					<View className="gap-2 flex items-start">
						<View className="flex w-full flex-row items-center justify-between">
							<Text
								className="text-base flex-wrap"
								style={{
									color: COLORS.dark.foreground.subtle,
									opacity: 0.9,
								}}
							>
								{t('common.pageXOfY', { current: currentPage, total: data.pages })}
							</Text>

							<Text
								className="text-base flex-wrap"
								style={{
									color: COLORS.dark.foreground.subtle,
									opacity: 0.9,
								}}
							>
								{data.readProgress?.updatedAt
									? formatDistanceToNow(new Date(data.readProgress?.updatedAt), { addSuffix: true })
									: 'unknown time ago'}
							</Text>
						</View>

						{percentageCompleted != null && (
							<Progress
								className="h-1"
								indicatorClassName="bg-[#f5f3ef]"
								trackClassName="bg-white/30"
								value={percentageCompleted}
								blurProps={{
									intensity: 4,
									blurTarget: blurTargetRef,
									blurMethod: 'dimezisBlurView',
								}}
							/>
						)}
					</View>
				</View>
			</Pressable>

			{renderTabletContent()}
		</View>
	)
}
