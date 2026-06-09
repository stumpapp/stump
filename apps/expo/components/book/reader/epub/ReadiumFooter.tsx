import { GlassView } from 'expo-glass-effect'
import {
	Bookmark,
	Info,
	List,
	LucideIcon,
	Menu,
	Palette,
	PencilLine,
	Search,
} from 'lucide-react-native'
import { cssInterop } from 'nativewind'
import { useEffect, useState } from 'react'
import { Pressable, View } from 'react-native'
import Animated, {
	Easing,
	Keyframe,
	useAnimatedStyle,
	useSharedValue,
	withDelay,
	withSpring,
	withTiming,
} from 'react-native-reanimated'

import { FADE_IN, FADE_OUT, useReaderAnimations } from '~/components/book/reader/shared'
import { Icon, Text } from '~/components/ui'
import { usePreferencesStore, useReaderStore } from '~/stores'
import { useEpubLocationStore, useEpubTheme } from '~/stores/epub'

import JumpButton from './JumpButton'

export const FOOTER_HEIGHT = 48

cssInterop(GlassView, { className: { target: 'style' } })

// For the menu button
const enteringAnimation = new Keyframe({
	from: { opacity: 0.02 },
	to: { opacity: 1, easing: Easing.inOut(Easing.quad) },
}).duration(350)

const exitingAnimation = new Keyframe({
	from: { opacity: 1 },
	to: { opacity: 0.02, easing: Easing.inOut(Easing.quad) },
}).duration(350)

type GlassMenuItemProps = {
	show: boolean
	delayIn: number
	delayOut: number
	onPress?: () => void
	icon?: LucideIcon
	label?: string
}

function MenuItem({ show, delayIn, delayOut, onPress, icon, label }: GlassMenuItemProps) {
	const progress = useSharedValue(0)
	const [glassActive, setGlassActive] = useState(false)

	// glassEffectStyle animation is the proper way to animate the GlassViews
	// but doesn't seem to work well with isInteractive on the menu button
	useEffect(() => {
		let timeout: NodeJS.Timeout
		if (show) {
			timeout = setTimeout(() => setGlassActive(true), delayIn)
			progress.value = withDelay(delayIn, withSpring(1, { damping: 10, stiffness: 150, mass: 0.8 }))
		} else {
			timeout = setTimeout(() => setGlassActive(false), delayOut)
			progress.value = withDelay(delayOut, withTiming(0, { duration: 350 }))
		}
		return () => clearTimeout(timeout)
	}, [show, delayIn, delayOut, progress])

	const animatedContentStyle = useAnimatedStyle(() => ({
		opacity: progress.value,
	}))

	const animatedWrapperStyle = useAnimatedStyle(() => ({
		transform: [{ translateY: 20 * (1 - progress.value) }],
	}))

	const isWide = !!label && !!icon
	const contentClassName = isWide
		? 'p-4 flex-row items-center justify-between w-full'
		: 'p-3 items-center justify-center w-full'

	return (
		<Animated.View style={animatedWrapperStyle} className="flex-1">
			<GlassView
				className="rounded-full"
				isInteractive
				glassEffectStyle={{
					style: glassActive ? 'regular' : 'none',
					animate: true,
					animationDuration: 0.35,
				}}
			>
				<Animated.View style={animatedContentStyle}>
					<Pressable onPress={onPress} className={contentClassName}>
						{label && <Text className="font-medium">{label}</Text>}
						{icon && <Icon as={icon} size={21} strokeWidth={2.2} />}
					</Pressable>
				</Animated.View>
			</GlassView>
		</Animated.View>
	)
}

export default function ReadiumFooter() {
	const showControls = useReaderStore((state) => state.showControls)
	const setShowControls = useReaderStore((state) => state.setShowControls)
	const [showMenu, setShowMenu] = useState(false)
	const [showMenuButton, setShowMenuButton] = useState(showControls && !showMenu)

	useEffect(() => {
		// Modify
		setShowMenuButton(showControls)
	}, [showControls])

	return (
		<>
			{showMenu && (
				<Pressable className="inset-0 absolute z-30" onPress={() => setShowMenu(false)} />
			)}

			<View className="inset-x-safe bottom-safe h-12 absolute items-center justify-center">
				<View
					className="bottom-16 right-4 gap-2 absolute z-40 flex-col items-end"
					style={{ width: 260 }}
					pointerEvents={showMenu ? 'auto' : 'none'}
				>
					<MenuItem
						show={showMenu}
						delayIn={200}
						delayOut={200}
						label="Table of Contents"
						icon={List}
					/>

					<MenuItem
						show={showMenu}
						delayIn={150}
						delayOut={150}
						label="Search Book"
						icon={Search}
					/>

					<MenuItem
						show={showMenu}
						delayIn={100}
						delayOut={100}
						label="Highlights & Annotations"
						icon={PencilLine}
					/>

					<MenuItem
						show={showMenu}
						delayIn={50}
						delayOut={50}
						label="Theme & Appearance"
						icon={Palette}
					/>

					<View className="gap-2 w-full flex-row items-center">
						<MenuItem label="1h 42m" show={showMenu} delayIn={0} delayOut={0} />
						<MenuItem show={showMenu} delayIn={0} delayOut={0} icon={Info} />
						<MenuItem show={showMenu} delayIn={0} delayOut={0} icon={Bookmark} />
					</View>
				</View>

				{showMenuButton && (
					<Animated.View
						entering={enteringAnimation}
						exiting={exitingAnimation}
						className="right-6 absolute z-30"
					>
						<GlassView className="items-center justify-center rounded-full" isInteractive>
							<Pressable
								disabled={!showMenuButton}
								onPress={() => {
									setShowMenu(true)
									setShowMenuButton(false)
									setShowControls(false)
								}}
								className="p-3"
							>
								<Icon as={Menu} size={30} />
							</Pressable>
						</GlassView>
					</Animated.View>
				)}

				<PageNumber />
			</View>
		</>
	)
}

function PageNumber() {
	const { colors } = useEpubTheme()

	const { secondaryStyle, primaryStyle } = useReaderAnimations()
	const preferMinimalReader = usePreferencesStore((state) => state.preferMinimalReader)
	const { page, pageOfTotal, formattedPageOfTotal } = usePositionFormat()

	return (
		<>
			{/* Controls hidden: Page only */}
			{!preferMinimalReader && (
				<Animated.View className="absolute w-full items-center justify-center" style={primaryStyle}>
					<Animated.View key={page} entering={FADE_IN} exiting={FADE_OUT}>
						<Text className="font-medium opacity-50" style={{ color: colors?.foreground }}>
							{page}
						</Text>
					</Animated.View>
				</Animated.View>
			)}

			{/* Controls shown: Page out of total */}
			<Animated.View className="absolute w-full items-center justify-center" style={secondaryStyle}>
				<JumpButton />

				<Animated.View key={page} entering={FADE_IN} exiting={FADE_OUT}>
					<Text className="font-medium opacity-50" style={{ color: colors?.foreground }}>
						{preferMinimalReader ? formattedPageOfTotal : pageOfTotal}
					</Text>
				</Animated.View>
			</Animated.View>
		</>
	)
}

function usePositionFormat() {
	const page = useEpubLocationStore((state) => state.position)
	const totalPages = useEpubLocationStore((state) => state.totalPages)

	const pageOfTotal = `${page} of ${totalPages}`
	const formattedPageOfTotal = page < totalPages ? pageOfTotal : page

	return { page, pageOfTotal, formattedPageOfTotal }
}
