import { ReadingDirection } from '@stump/graphql'
import { useRouter } from 'expo-router'
import { X } from 'lucide-react-native'
import { useCallback, useEffect } from 'react'
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
import { useBookPreferences } from '~/stores/reader'

import { PagedActionMenu } from '../shared/paged-action-menu/PagedActionMenu'
import { useImageBasedReader } from './context'

type Props = {
	onShowGlobalSettings: () => void
}

export default function Header({ onShowGlobalSettings }: Props) {
	const { height } = useDisplay()
	const { book, resetTimer, serverId } = useImageBasedReader()
	const {
		preferences: { readingDirection },
		setBookPreferences,
	} = useBookPreferences({ book, serverId })

	// TODO: I think global incognito makes sense but isn't exposed very well right now
	const incognito = useReaderStore((state) => state.globalSettings.incognito)
	const insets = useSafeAreaInsets()
	const visible = useReaderStore((state) => state.showControls)

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
	}, [visible, height, insets.top, opacity])

	const animatedStyles = useAnimatedStyle(() => {
		return {
			top: insets.top || 12,
			left: insets.left,
			right: insets.right,
			// transform: [{ translateY: translateY.value }],
			opacity: opacity.value,
		}
	})

	const onChangeReadingDirection = useCallback(() => {
		setBookPreferences({
			readingDirection:
				readingDirection === ReadingDirection.Ltr ? ReadingDirection.Rtl : ReadingDirection.Ltr,
		})
	}, [readingDirection, setBookPreferences])

	const router = useRouter()

	// FIXME: The native buttons (iOS) shift when the y position is animated. Making the position "fixed"
	// fixes it but we obv can't do that. For the time being, I've swapped to
	// opacity animation to avoid the layout shift issues
	return (
		<Animated.View className="absolute z-20 gap-2 px-2" style={animatedStyles}>
			<View className="relative flex-row items-center justify-between">
				<HeaderButton
					icon={{
						android: X,
						ios: 'xmark',
						color: Platform.OS === 'android' ? COLORS.dark.foreground.DEFAULT : 'primary',
					}}
					onPress={() => router.back()}
					ios={{ variant: 'glass' }}
					style={
						Platform.OS === 'android'
							? {
									backgroundColor: COLORS.dark.background.overlay.DEFAULT,
									borderColor: COLORS.dark.edge.DEFAULT,
									height: 40,
									width: 40,
								}
							: undefined
					}
				/>

				<PagedActionMenu
					incognito={incognito}
					book={book}
					serverId={serverId}
					onResetTimer={resetTimer}
					onChangeReadingDirection={onChangeReadingDirection}
					onShowSettings={onShowGlobalSettings}
				/>
			</View>

			<Heading
				className="font-semibold tablet:text-3xl"
				numberOfLines={2}
				ellipsizeMode="tail"
				style={{
					color: COLORS.dark.foreground.DEFAULT,
				}}
			>
				{book.name}
			</Heading>
		</Animated.View>
	)
}
