import { useRouter } from 'expo-router'
import { useEffect } from 'react'
import { Platform, View } from 'react-native'
import Animated, {
	Easing,
	useAnimatedStyle,
	useSharedValue,
	withTiming,
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { Heading } from '~/components/ui'
import { HeaderButton } from '~/components/ui/header-button/header-button'
import { COLORS } from '~/lib/constants'
import { useDisplay } from '~/lib/hooks'
import { useReaderStore } from '~/stores'
import { usePdfStore } from '~/stores/pdf'

import { PagedActionMenu } from '../shared/paged-action-menu/PagedActionMenu'
import { usePdfReaderContext } from './context'

export function PdfReaderHeader() {
	const { height } = useDisplay()
	const { serverId, resetTimer } = usePdfReaderContext()

	const visible = useReaderStore((state) => state.showControls)
	const book = usePdfStore((state) => state.book)

	const insets = useSafeAreaInsets()

	// const translateY = useSharedValue(-200)
	const opacity = useSharedValue(0)
	useEffect(() => {
		// translateY.value = withTiming(visible ? 0 : -200, {
		// 	duration: 250,
		// 	easing: visible ? Easing.out(Easing.quad) : Easing.in(Easing.quad),
		// })
		opacity.value = withTiming(visible ? 1 : 0, {
			duration: 250,
			easing: visible ? Easing.out(Easing.linear) : Easing.in(Easing.linear),
		})
	}, [visible, opacity, height, insets.top])

	const animatedStyles = useAnimatedStyle(() => {
		return {
			top: insets.top + (Platform.OS === 'android' ? 12 : 0),
			left: insets.left,
			right: insets.right,
			// transform: [{ translateY: translateY.value }],
			opacity: opacity.value,
		}
	})

	const router = useRouter()

	// FIXME: The native buttons (iOS) shift when the y position is animated. Making the position "fixed"
	// fixes it but we obv can't do that. For the time being, I've swapped to
	// opacity animation to avoid the layout shift issues
	return (
		<Animated.View key={book?.id} className="absolute z-20 gap-4 px-4" style={animatedStyles}>
			<View className="flex-row items-center justify-between">
				<HeaderButton onPress={() => router.back()} ios={{ variant: 'glass' }} />

				{book && <PagedActionMenu book={book} serverId={serverId} onResetTimer={resetTimer} />}
			</View>

			<Heading
				className="font-semibold tablet:text-3xl"
				numberOfLines={2}
				ellipsizeMode="tail"
				style={{
					color: COLORS.dark.foreground.DEFAULT,
				}}
			>
				{book?.name}
			</Heading>
		</Animated.View>
	)
}
