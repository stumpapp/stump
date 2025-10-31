import { useSDK } from '@stump/client'
import { useRouter } from 'expo-router'
import { X } from 'lucide-react-native'
import { useCallback, useEffect } from 'react'
import { View } from 'react-native'
import Animated, {
	Easing,
	useAnimatedStyle,
	useSharedValue,
	withTiming,
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { BorderAndShadow } from '~/components/BorderAndShadow'
import { TurboImage } from '~/components/Image'
import { Button, Heading, Icon, Label, Text } from '~/components/ui'
import { COLORS } from '~/lib/constants'
import { useDisplay } from '~/lib/hooks'
import { cn } from '~/lib/utils'
import { usePreferencesStore } from '~/stores'

import { NextInSeriesBookRef, useImageBasedReader } from './context'

type Props = {
	isVisible: boolean
	book: NextInSeriesBookRef
	onClose: () => void
}

export default function NextUpOverlay({ isVisible, book, onClose }: Props) {
	const { sdk } = useSDK()
	const { serverId } = useImageBasedReader()

	const router = useRouter()
	const thumbnailRatio = usePreferencesStore((state) => state.thumbnailRatio)

	const { isTablet, width } = useDisplay()

	const animatedOpacity = useSharedValue(isVisible ? 1 : 0)
	useEffect(() => {
		animatedOpacity.value = withTiming(isVisible ? 1 : 0, {
			duration: 250,
			easing: Easing.out(Easing.quad),
		})
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [isVisible])

	const containerStyles = useAnimatedStyle(() => {
		return {
			opacity: animatedOpacity.value,
			display: animatedOpacity.value === 0 ? 'none' : 'flex',
		}
	})

	const size = isTablet ? 400 : width * 0.8

	const onReadNext = useCallback(() => {
		router.replace(
			{
				// @ts-expect-error: It is fine, expects string literal with [id]
				pathname: `/server/${serverId}/books/${book.id}`,
			},
			{
				withAnchor: true,
			},
		)
	}, [router, serverId, book.id])

	const insets = useSafeAreaInsets()

	return (
		<Animated.View className={cn('absolute inset-0 z-10 flex-1')} style={containerStyles}>
			<View
				className="absolute z-30"
				style={{
					paddingTop: insets.top,
				}}
			>
				<View className="flex-row items-center justify-between">
					<Button
						className="squircle h-[unset] w-[unset] rounded-full border p-1 tablet:p-2"
						variant="ghost"
						size="icon"
						style={{
							backgroundColor: COLORS.dark.background.overlay.DEFAULT,
							borderColor: COLORS.dark.edge.DEFAULT,
							zIndex: 100,
						}}
						onPress={() => onClose()}
					>
						{({ pressed }) => (
							<Icon
								as={X}
								style={{
									opacity: pressed ? 0.85 : 1,
									// @ts-expect-error: This is fine
									color: COLORS.dark.foreground.DEFAULT,
								}}
							/>
						)}
					</Button>
				</View>
			</View>

			<View style={{ flex: 1, backgroundColor: 'hsla(0, 0%, 0%, 0.75)' }} />

			<View className="absolute inset-0 flex-1 items-center justify-center gap-4">
				<View>
					<Label className="text-white opacity-80">Next Up:</Label>
					<Heading size="xl" className="text-center text-white">
						{book.name}
					</Heading>
				</View>
				<BorderAndShadow
					style={{ borderRadius: 12, borderWidth: 0.8, shadowRadius: 5, elevation: 8 }}
					outerStyle={{ shadowColor: 'white' }}
				>
					<TurboImage
						source={{
							uri: book.thumbnailUrl,
							headers: {
								...sdk.customHeaders,
								Authorization: sdk.authorizationHeader || '',
							},
						}}
						resizeMode="stretch"
						resize={size * 1.5}
						style={{
							width: size,
							height: size / thumbnailRatio,
						}}
					/>
				</BorderAndShadow>

				<View
					className="flex flex-row items-center tablet:max-w-sm tablet:self-center"
					style={{
						width: size + 16,
					}}
				>
					<Button className="flex-1 border border-edge bg-white opacity-80" onPress={onReadNext}>
						<Text className="text-black">Read Next</Text>
					</Button>
				</View>
			</View>
		</Animated.View>
	)
}
