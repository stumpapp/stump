import { TrueSheet } from '@lodev09/react-native-true-sheet'
import { useGraphQL, useSDK } from '@stump/client'
import { graphql, PreviewBookSheetQuery } from '@stump/graphql'
import { forwardRef, useImperativeHandle, useRef } from 'react'
import { Platform, View } from 'react-native'
import Animated, {
	Extrapolation,
	interpolate,
	useAnimatedRef,
	useAnimatedStyle,
	useScrollOffset,
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import TImage from 'react-native-turbo-image'

import { IS_IOS_24_PLUS, useColors } from '~/lib/constants'
import { usePreferencesStore } from '~/stores'

import { ThumbnailImage } from '../image'
import { Button, Heading, Text } from '../ui'

const query = graphql(`
	query PreviewBookSheet($id: ID!) {
		mediaById(id: $id) {
			id
			resolvedName
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
			}
			metadata {
				genres
				writers
			}
			tags {
				name
			}
		}
	}
`)

export type PreviewBookSheetRef = {
	open: () => void
	close: () => void
}

type Props = {
	bookId?: string | null
	onConfirmAddBook: () => void
}

export const PreviewBookSheet = forwardRef<PreviewBookSheetRef, Props>(
	({ bookId, onConfirmAddBook }, ref) => {
		const sheetRef = useRef<TrueSheet>(null)

		useImperativeHandle(ref, () => ({
			open: () => {
				sheetRef.current?.present()
			},
			close: () => {
				sheetRef.current?.dismiss()
			},
		}))

		const { data } = useGraphQL(
			query,
			['mediaById', bookId, 'preview'],
			{
				id: bookId || '',
			},
			{
				enabled: !!bookId,
			},
		)
		const book = data?.mediaById

		const colors = useColors()
		const insets = useSafeAreaInsets()

		return (
			<TrueSheet
				ref={sheetRef}
				detents={[1]}
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
				{book && <BookContent book={book} onConfirmAddBook={onConfirmAddBook} />}
			</TrueSheet>
		)
	},
)
PreviewBookSheet.displayName = 'PreviewBookSheet'

type BookContentProps = {
	book: NonNullable<NonNullable<PreviewBookSheetQuery>['mediaById']>
} & Pick<Props, 'onConfirmAddBook'>

function BookContent({ book, onConfirmAddBook }: BookContentProps) {
	const { sdk } = useSDK()

	const thumbnailRatio = usePreferencesStore((store) => store.thumbnailRatio)

	const animatedScrollRef = useAnimatedRef<Animated.ScrollView>()
	const scrollOffset = useScrollOffset(animatedScrollRef)

	const parallaxStyle = useAnimatedStyle(() => {
		return {
			transform: [
				{ translateY: interpolate(scrollOffset.value, [0, 200], [0, 100], Extrapolation.EXTEND) },
			],
		}
	})

	const { url: uri, metadata: placeholderData } = book.thumbnail

	return (
		<Animated.ScrollView className="flex-1 bg-background" ref={animatedScrollRef}>
			<View className="ios:pt-safe-offset-20 pt-safe overflow-hidden pb-8">
				<Animated.View
					// -inset-24 is because when using a lot of blur, the sides get more transparent
					// so we have to "zoom in" to have a clean line at the bottom rather than a gradient
					className="absolute -inset-24 opacity-70 dark:opacity-30"
					style={parallaxStyle}
				>
					<TImage
						source={{
							uri,
							headers: {
								...sdk.customHeaders,
								Authorization: sdk.authorizationHeader || '',
							},
						}}
						style={{ width: '100%', height: '100%' }}
						resizeMode="cover"
						fadeDuration={2000}
						{...(Platform.OS === 'ios' && { indicator: { color: 'transparent' } })}
						// android only supports up to blur={25} which doesn't look good,
						// but if we heavily downscale first, the following looks near identical to using
						// original res with blur={40} on ios, which is what I originally settled on
						resize={60}
						blur={Platform.OS === 'ios' ? 7 : 16}
					/>
				</Animated.View>

				<View className="gap-8 px-4 tablet:px-6">
					<ThumbnailImage
						source={{
							uri,
							headers: {
								...sdk.customHeaders,
								Authorization: sdk.authorizationHeader || '',
							},
						}}
						resizeMode="stretch"
						size={{ height: 235 / thumbnailRatio, width: 235 }}
						placeholderData={placeholderData}
						borderAndShadowStyle={{ shadowRadius: 5 }}
					/>

					<View className="gap-2">
						<Heading size="lg" className="text-center leading-6">
							{book.resolvedName}
						</Heading>

						{/* TODO: Tags? Genres? */}
					</View>

					<View className="flex w-full flex-row items-center gap-x-2 tablet:max-w-sm tablet:self-center">
						<Button variant="brand" className="flex-1" roundness="full" onPress={onConfirmAddBook}>
							<Text>Add to Club</Text>
						</Button>
					</View>
				</View>
			</View>
		</Animated.ScrollView>
	)
}
