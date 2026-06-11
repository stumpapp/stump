import Octicons from '@expo/vector-icons/Octicons'
import { GlassView } from 'expo-glass-effect'
import { LucideIcon } from 'lucide-react-native'
import { cssInterop } from 'nativewind'
import { useEffect } from 'react'
import { Pressable } from 'react-native'
import Animated, {
	createAnimatedComponent,
	interpolate,
	interpolateColor,
	useAnimatedStyle,
	useSharedValue,
	withDelay,
	withSpring,
	withTiming,
} from 'react-native-reanimated'

import { Icon, Text } from '~/components/ui'
import { cn } from '~/lib/utils'
import { useEpubTheme } from '~/stores/epub'

import { useBookmark } from './useBookmark'

cssInterop(GlassView, { className: { target: 'style' } })

const AnimatedOcticons = createAnimatedComponent(Octicons)

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
	const { colors, isDarkEpubTheme } = useEpubTheme()
	const { animatedStyle } = useMenuAnimation({ show, delay })

	const isWide = !!label && !!icon
	const contentClassName = isWide ? WIDE_BUTTON_CLASS_NAME : SMALL_BUTTON_CLASS_NAME

	return (
		<Animated.View style={animatedStyle} className={className}>
			<GlassView
				className="rounded-full"
				isInteractive
				colorScheme={isDarkEpubTheme ? 'dark' : 'light'}
			>
				<Pressable onPress={onPress} className={contentClassName} disabled={disabled}>
					{label && (
						<Text className="font-medium" style={{ color: colors?.foreground }}>
							{label}
						</Text>
					)}
					{icon && <Icon as={icon} size={21} strokeWidth={2.2} color={colors?.foreground} />}
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
	const { colors, isDarkEpubTheme } = useEpubTheme()
	const { toggleBookmark, disabled, isBookmarked } = useBookmark()
	const { animatedStyle } = useMenuAnimation({ show, delay })

	const colorProgress = useSharedValue(isBookmarked ? 1 : 0)

	useEffect(() => {
		colorProgress.value = withTiming(isBookmarked ? 1 : 0, { duration: 300 })
	}, [isBookmarked, colorProgress])

	const iconBackgroundStyle = useAnimatedStyle(() => ({
		backgroundColor: interpolateColor(colorProgress.value, [0, 1], ['transparent', '#dc2626']),
	}))

	// there are two styles because we do: not bookmarked => non-filled icon, bookmarked => filled icon
	const iconNonFilledStyle = useAnimatedStyle(() => ({
		color: interpolateColor(colorProgress.value, [0, 1], [colors?.foreground || '#000', '#facc15']),
	}))
	const iconFilledStyle = useAnimatedStyle(() => ({
		color: interpolateColor(colorProgress.value, [0, 1], ['transparent', '#facc15']),
	}))

	return (
		<Animated.View style={animatedStyle} className={className}>
			<GlassView
				className="rounded-full"
				isInteractive
				colorScheme={isDarkEpubTheme ? 'dark' : 'light'}
			>
				<Pressable onPress={toggleBookmark} disabled={disabled}>
					<Animated.View
						style={iconBackgroundStyle}
						className={cn(SMALL_BUTTON_CLASS_NAME, 'squircle overflow-hidden rounded-full')}
					>
						<AnimatedOcticons
							name="bookmark"
							size={21}
							style={iconNonFilledStyle}
							className="scale-x-90"
						/>
						<AnimatedOcticons
							name="bookmark-filled"
							size={21}
							style={iconFilledStyle}
							className="absolute scale-x-90"
						/>
					</Animated.View>
				</Pressable>
			</GlassView>
		</Animated.View>
	)
}

function useMenuAnimation({ show, delay }: { show: boolean; delay: number }) {
	const progress = useSharedValue(0)

	useEffect(() => {
		if (show) {
			progress.value = withDelay(delay, withSpring(1, { damping: 10, stiffness: 150, mass: 0.8 }))
		} else {
			progress.value = withDelay(delay, withTiming(0, { duration: 350 }))
		}
	}, [show, delay, progress])

	// GlassViews don't like zero opacity, so instead we make them disappear with scale
	const animatedStyle = useAnimatedStyle(() => ({
		transform: [{ translateY: 20 * (1 - progress.value) }, { scale: progress.value === 0 ? 0 : 1 }],
		opacity: interpolate(progress.value, [0, 1], [0.02, 1]),
	}))

	return { animatedStyle }
}
