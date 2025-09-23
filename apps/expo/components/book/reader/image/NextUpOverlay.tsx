import { useSDK } from '@stump/client'
import { useRouter } from 'expo-router'
import { Fragment, useCallback, useEffect } from 'react'
import { View } from 'react-native'
import { Pressable } from 'react-native-gesture-handler'
import LinearGradient from 'react-native-linear-gradient'
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { useActiveServer } from '~/components/activeServer'
import { TurboImage } from '~/components/Image'
import { Button, Heading, icons, Label, Text } from '~/components/ui'
import { COLORS } from '~/lib/constants'
import { useDisplay } from '~/lib/hooks'
import { cn } from '~/lib/utils'

import { NextInSeriesBookRef } from './context'

const { X } = icons

type Props = {
	isVisible: boolean
	book: NextInSeriesBookRef
	onClose: () => void
}
export default function NextUpOverlay({ isVisible, book, onClose }: Props) {
	const { sdk } = useSDK()
	const {
		activeServer: { id: serverID },
	} = useActiveServer()

	const router = useRouter()
	const container = useSharedValue(isVisible ? 1 : 0)

	const { isTablet, width } = useDisplay()

	useEffect(
		() => {
			container.value = withTiming(isVisible ? 1 : 0, {
				duration: 100,
			})
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[isVisible],
	)

	const containerStyles = useAnimatedStyle(() => {
		return {
			display: container.value === 1 ? 'flex' : 'none',
		}
	})

	const size = isTablet ? 400 : width * 0.8

	const onReadNext = useCallback(() => {
		router.replace(
			{
				// @ts-expect-error: It is fine, expects string literal with [id]
				pathname: `/server/${serverID}/books/${book.id}`,
			},
			{
				withAnchor: true,
			},
		)
	}, [router, serverID, book.id])

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
							<X
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

			<LinearGradient
				colors={[
					'hsla(0, 0%, 0%, 0.75)',
					'hsla(0, 0%, 0%, 0.75)',
					'hsla(0, 0%, 0%, 0.5)',
					'hsla(0, 0%, 0%, 0.5)',
					'hsla(0, 0%, 0%, 0.5)',
					'hsla(0, 0%, 0%, 0.5)',
					'hsla(0, 0%, 0%, 0.75)',
					'hsla(0, 0%, 0%, 0.95)',
				]}
				style={{
					flex: 1,
				}}
			/>

			<View className="absolute inset-0 flex-1 items-center justify-center gap-4">
				<View>
					<Label className="text-white opacity-80">Next Up:</Label>
					<Heading size="xl" className="text-center text-white">
						{book.name}
					</Heading>
				</View>
				<TurboImage
					source={{
						uri: book.thumbnailUrl,
						headers: {
							Authorization: sdk.authorizationHeader || '',
						},
					}}
					resizeMode="stretch"
					resize={size * 1.5}
					style={{ width: size, height: size / (2 / 3), borderRadius: 12 }}
				/>

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
