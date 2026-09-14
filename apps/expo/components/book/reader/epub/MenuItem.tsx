import Octicons from '@react-native-vector-icons/octicons'
import { getColor, mix } from 'colorjs.io/fn'
import { GlassView } from 'expo-glass-effect'
import { LucideIcon } from 'lucide-react-native'
import { cssInterop } from 'nativewind'
import { useEffect } from 'react'
import { Pressable } from 'react-native'
import Animated, {
	createAnimatedComponent,
	interpolate,
	interpolateColor,
	useAnimatedProps,
	useAnimatedStyle,
	useSharedValue,
	withDelay,
	withSpring,
	withTiming,
} from 'react-native-reanimated'

import { Icon, Text } from '~/components/ui'
import { IS_IOS_26_PLUS, toHex } from '~/lib/constants'
import { cn } from '~/lib/utils'
import { useEpubTheme } from '~/stores/epub'

import { useBookmark } from './useBookmark'

cssInterop(GlassView, { className: { target: 'style' } })

const AnimatedOcticons = createAnimatedComponent(Octicons)
const AnimatedGlassView = createAnimatedComponent(GlassView)

type GlassMenuItemProps = {
	show: boolean
	delay: number
	onPress?: () => void
	icon?: LucideIcon
	label?: string
	disabled?: boolean
	className?: string
}

const SMALL_BUTTON_CLASS_NAME = cn`p-3 w-full items-center justify-center`
const WIDE_BUTTON_CLASS_NAME = cn`p-4 w-full flex-row items-center justify-between`

export function MenuItem({
	show,
	delay,
	onPress,
	icon,
	label,
	disabled,
	className,
}: GlassMenuItemProps) {
	const { isDarkEpubTheme } = useEpubTheme()
	const { animatedStyle } = useMenuAnimation({ show, delay })
	const buttonColors = useButtonColors()

	const isWide = !!label && !!icon
	const contentClassName = isWide ? WIDE_BUTTON_CLASS_NAME : SMALL_BUTTON_CLASS_NAME

	return (
		<Animated.View style={animatedStyle} className={className}>
			<GlassView
				className={cn('rounded-full', !IS_IOS_26_PLUS && 'squircle')}
				isInteractive
				colorScheme={isDarkEpubTheme ? 'dark' : 'light'}
				style={{ backgroundColor: buttonColors.menuItem.background }}
			>
				<Pressable
					onPress={onPress}
					className={cn(contentClassName, !IS_IOS_26_PLUS && isWide && 'active:opacity-60')}
					disabled={disabled}
				>
					{label && (
						<Text className="font-medium" style={{ color: buttonColors.menuItem.foreground }}>
							{label}
						</Text>
					)}
					{icon && (
						<Icon as={icon} size={21} strokeWidth={2.2} color={buttonColors.menuItem.foreground} />
					)}
				</Pressable>
			</GlassView>
		</Animated.View>
	)
}

export function BookmarkMenuItem({
	show,
	delay,
	className,
}: Pick<GlassMenuItemProps, 'show' | 'delay' | 'className'>) {
	const { isDarkEpubTheme } = useEpubTheme()
	const { toggleBookmark, disabled, isBookmarked } = useBookmark()
	const { animatedStyle } = useMenuAnimation({ show, delay })
	const buttonColors = useButtonColors()

	const colorProgress = useSharedValue(isBookmarked ? 1 : 0)

	useEffect(() => {
		colorProgress.value = withTiming(isBookmarked ? 1 : 0, { duration: 300 })
	}, [isBookmarked, colorProgress])

	// For the background colour:
	// - For ios 26+: animate prop 'tintColor' on AnimatedGlassView
	// - Otherwise: animate 'backgroundColor' on Animated.View
	const ios26BackgroundColor = useAnimatedProps(() => ({
		tintColor: interpolateColor(colorProgress.value, [0, 1], ['transparent', '#dc2626']),
	}))
	const iconBackgroundColor = useAnimatedStyle(() => {
		if (IS_IOS_26_PLUS) return {}
		return {
			backgroundColor: interpolateColor(colorProgress.value, [0, 1], ['transparent', '#dc2626']),
		}
	})

	// there are two styles because we do: not bookmarked => non-filled icon, bookmarked => filled icon
	const iconNonFilledStyle = useAnimatedStyle(() => ({
		color: interpolateColor(
			colorProgress.value,
			[0, 1],
			[buttonColors.menuItem.foreground || '#000', '#facc15'],
		),
	}))
	const iconFilledStyle = useAnimatedStyle(() => ({
		color: interpolateColor(colorProgress.value, [0, 1], ['transparent', '#facc15']),
	}))

	return (
		<Animated.View style={animatedStyle} className={className}>
			<AnimatedGlassView
				className={cn('rounded-full', !IS_IOS_26_PLUS && 'squircle')}
				isInteractive
				colorScheme={isDarkEpubTheme ? 'dark' : 'light'}
				style={{ backgroundColor: buttonColors.menuItem.background }}
				animatedProps={ios26BackgroundColor}
			>
				<Pressable onPress={toggleBookmark} disabled={disabled}>
					<Animated.View
						style={iconBackgroundColor}
						className={cn(SMALL_BUTTON_CLASS_NAME, 'squircle overflow-hidden rounded-full')}
					>
						<AnimatedOcticons
							name="bookmark"
							size={21}
							style={[iconNonFilledStyle, { transform: [{ scaleX: 0.9 }] }]}
						/>
						<AnimatedOcticons
							name="bookmark-filled"
							size={21}
							style={[iconFilledStyle, { position: 'absolute', transform: [{ scaleX: 0.9 }] }]}
						/>
					</Animated.View>
				</Pressable>
			</AnimatedGlassView>
		</Animated.View>
	)
}

function useMenuAnimation({ show, delay }: { show: boolean; delay: number }) {
	const progress = useSharedValue(0)
	const opacity = useSharedValue(0)

	useEffect(() => {
		if (show) {
			progress.value = withDelay(delay, withSpring(1, { damping: 10, stiffness: 150, mass: 0.8 }))
			opacity.value = withDelay(delay, withTiming(1, { duration: 350 }))
		} else {
			progress.value = withDelay(delay, withTiming(0, { duration: 350 }))
			opacity.value = withDelay(delay, withTiming(0, { duration: 350 }))
		}
	}, [show, delay, progress, opacity])

	// GlassViews don't like zero opacity, so instead we make them disappear with scale
	const animatedStyle = useAnimatedStyle(() => ({
		transform: [{ translateY: 20 * (1 - progress.value) }, { scale: progress.value === 0 ? 0 : 1 }],
		opacity: interpolate(opacity.value, [0, 1], [0.02, 1]),
	}))

	return { animatedStyle }
}

export function useButtonColors() {
	const { colors, isDarkEpubTheme } = useEpubTheme()

	const fgColor = getColor(colors?.foreground || 'black')
	const bgColor = getColor(colors?.background || 'white')

	const background = !IS_IOS_26_PLUS
		? toHex(mix(fgColor, bgColor, isDarkEpubTheme ? 0.75 : 0.9, { space: 'oklch' }))
		: undefined

	// header/footer text is colors?.foreground with opacity-50. This is the exact equivalent solid colour
	const iconColor = toHex(mix(fgColor, bgColor, 0.5, { space: 'oklch' }))

	return {
		controls: { background, foreground: iconColor },
		menuItem: { background, foreground: colors?.foreground },
	}
}
