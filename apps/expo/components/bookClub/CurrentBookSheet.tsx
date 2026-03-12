import { TrueSheet } from '@lodev09/react-native-true-sheet'
import { useSDK } from '@stump/client'
import { CurrentBookCardFragment } from '@stump/graphql'
import { useRouter } from 'expo-router'
import { forwardRef, useImperativeHandle, useRef } from 'react'
import { Platform, View } from 'react-native'
import { Linking } from 'react-native'
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

import { useActiveServer } from '../activeServer'
import { ThumbnailImage } from '../image'
import { Button, Heading, Text } from '../ui'
import { getClubBookThumbnailData } from './utils'

export type CurrentBookSheetRef = {
	open: () => void
	close: () => void
}

type Props = {
	book: CurrentBookCardFragment
}

export const CurrentBookSheet = forwardRef<CurrentBookSheetRef, Props>(({ book }, ref) => {
	const sheetRef = useRef<TrueSheet>(null)

	useImperativeHandle(ref, () => ({
		open: () => {
			sheetRef.current?.present()
		},
		close: () => {
			sheetRef.current?.dismiss()
		},
	}))

	const colors = useColors()
	const insets = useSafeAreaInsets()

	const {
		activeServer: { id: serverId },
	} = useActiveServer()
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

	const thumbnailData = getClubBookThumbnailData(book, {
		getHeaders: () => ({
			...sdk.customHeaders,
			Authorization: sdk.authorizationHeader || '',
		}),
	})

	const router = useRouter()

	const onGoToBook = () => {
		sheetRef.current?.dismiss()
		if (book.url) {
			Linking.openURL(book.url)
		} else if (book.entity?.id) {
			router.navigate(`/server/${serverId}/books/${book.entity.id}`)
		}
	}

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
								uri: thumbnailData?.url || '',
								headers: thumbnailData?.headers,
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
								uri: thumbnailData?.url || '',
								headers: thumbnailData?.headers,
							}}
							size={{ height: 235 / thumbnailRatio, width: 235 }}
							placeholderData={thumbnailData?.placeholderData}
							borderAndShadowStyle={{ shadowRadius: 5 }}
						/>

						<View className="gap-2">
							<Heading size="lg" className="text-center leading-6">
								{book.entity?.resolvedName || book.title}
							</Heading>
						</View>

						<View className="flex w-full flex-row items-center gap-x-2 tablet:max-w-sm tablet:self-center">
							<Button
								variant="brand"
								className="flex-1"
								roundness="full"
								onPress={onGoToBook}
								disabled={!book.entity?.id && !book.url}
							>
								<Text>Go to Book</Text>
							</Button>
						</View>

						{/* TODO: Add more details here */}
					</View>
				</View>
			</Animated.ScrollView>
		</TrueSheet>
	)
})
CurrentBookSheet.displayName = 'CurrentBookSheet'
