import { formatNarrowDuration, useLocaleContext } from '@stump/i18n'
import { GlassView } from 'expo-glass-effect'
import {
	Bookmark,
	BookmarkCheck,
	List,
	LucideIcon,
	Menu,
	Palette,
	PencilLine,
} from 'lucide-react-native'
import { cssInterop } from 'nativewind'
import { useEffect, useState } from 'react'
import { Pressable, View } from 'react-native'
import Animated, {
	useAnimatedStyle,
	useSharedValue,
	withDelay,
	withSpring,
	withTiming,
} from 'react-native-reanimated'

import {
	ENTERING_ANIMATION,
	EXITING_ANIMATION,
	FADE_IN,
	FADE_OUT,
} from '~/components/book/reader/shared'
import { Icon, Text } from '~/components/ui'
import { usePreferencesStore, useReaderStore } from '~/stores'
import { useEpubLocationStore, useEpubTheme } from '~/stores/epub'
import { useEpubSheetStore } from '~/stores/epubSheet'

import { useEpubReaderContext } from './context'
import JumpButton from './JumpButton'
import { useBookmark } from './useBookmark'

export const FOOTER_HEIGHT = 48

cssInterop(GlassView, { className: { target: 'style' } })

type GlassMenuItemProps = {
	show: boolean
	delay: number
	onPress?: () => void
	icon?: LucideIcon
	label?: string
	disabled?: boolean
	className?: string
}

function MenuItem({ show, delay, onPress, icon, label, disabled, className }: GlassMenuItemProps) {
	const { colors, isDarkEpubTheme } = useEpubTheme()

	const progress = useSharedValue(0)
	const [glassActive, setGlassActive] = useState(false)

	// glassEffectStyle animation is the proper way to animate the GlassViews
	// but doesn't seem to work well with isInteractive on the menu button
	useEffect(() => {
		let timeout: NodeJS.Timeout
		if (show) {
			timeout = setTimeout(() => setGlassActive(true), delay)
			progress.value = withDelay(delay, withSpring(1, { damping: 10, stiffness: 150, mass: 0.8 }))
		} else {
			timeout = setTimeout(() => setGlassActive(false), delay)
			progress.value = withDelay(delay, withTiming(0, { duration: 350 }))
		}
		return () => clearTimeout(timeout)
	}, [show, delay, progress])

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
		<Animated.View style={animatedWrapperStyle} className={className}>
			<GlassView
				className="rounded-full"
				isInteractive
				glassEffectStyle={{
					style: glassActive ? 'regular' : 'none',
					animate: true,
					animationDuration: 0.35,
				}}
				colorScheme={isDarkEpubTheme ? 'dark' : 'light'}
			>
				<Animated.View style={animatedContentStyle}>
					<Pressable onPress={onPress} className={contentClassName} disabled={disabled}>
						{label && (
							<Text className="font-medium" style={{ color: colors?.foreground }}>
								{label}
							</Text>
						)}
						{icon && <Icon as={icon} size={21} strokeWidth={2.2} color={colors?.foreground} />}
					</Pressable>
				</Animated.View>
			</GlassView>
		</Animated.View>
	)
}

export default function ReadiumFooter() {
	const showControls = useReaderStore((state) => state.showControls)
	const setShowControls = useReaderStore((state) => state.setShowControls)
	const openSheet = useEpubSheetStore((state) => state.openSheet)
	const { colors, isDarkEpubTheme } = useEpubTheme()
	const { isBookmarked, disabled: bookmarkDisabled, toggleBookmark } = useBookmark()

	const [showMenu, setShowMenu] = useState(false)

	const { timer } = useEpubReaderContext()
	const { locale } = useLocaleContext()
	const [elapsedSeconds, setElapsedSeconds] = useState(0)
	const formattedReadTime = formatNarrowDuration(elapsedSeconds, { locale })

	return (
		<>
			{showMenu && (
				<Pressable
					className="inset-0 absolute z-30"
					onPress={() => {
						setShowMenu(false)
						timer?.resume()
					}}
				/>
			)}

			<View className="inset-x-safe bottom-safe h-12 absolute items-center justify-center">
				<View
					className="bottom-16 right-4 gap-2 w-80 absolute z-40 flex-col items-end"
					pointerEvents={showMenu ? 'auto' : 'none'}
				>
					<MenuItem
						show={showMenu}
						delay={150} // 200 with Search Book
						label="Table of Contents"
						icon={List}
						onPress={() => {
							openSheet('tableOfContents')
							setShowMenu(false)
						}}
					/>

					{/* <MenuItem
						show={showMenu}
						delay={150}
						label="Search Book"
						icon={Search}
					/> */}

					<MenuItem
						show={showMenu}
						delay={100}
						label="Bookmarks & Annotations"
						icon={PencilLine}
						onPress={() => {
							openSheet('annotations')
							setShowMenu(false)
						}}
					/>

					<MenuItem
						show={showMenu}
						delay={50}
						label="Appearance"
						icon={Palette}
						onPress={() => {
							openSheet('settings')
							setShowMenu(false)
						}}
					/>

					<View className="gap-2 w-full flex-row items-center">
						<MenuItem label={formattedReadTime} show={showMenu} delay={0} className="flex-1" />
						<MenuItem
							show={showMenu}
							delay={0}
							icon={isBookmarked ? BookmarkCheck : Bookmark}
							onPress={toggleBookmark}
							disabled={bookmarkDisabled}
							className="flex-1"
						/>
					</View>
				</View>

				{showControls && (
					<Animated.View
						entering={ENTERING_ANIMATION}
						exiting={EXITING_ANIMATION}
						className="right-6 absolute z-30"
					>
						<GlassView
							className="items-center justify-center rounded-full"
							isInteractive
							colorScheme={isDarkEpubTheme ? 'dark' : 'light'}
						>
							<Pressable
								disabled={!showControls}
								onPress={() => {
									timer?.pause()
									setElapsedSeconds(timer?.getCurrentTime() || 0)
									setShowMenu(true)
									setShowControls(false)
								}}
								className="p-3"
							>
								<Icon as={Menu} size={30} color={colors?.foreground} className="opacity-80" />
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
	const showControls = useReaderStore((state) => state.showControls)

	const preferMinimalReader = usePreferencesStore((state) => state.preferMinimalReader)
	const { page, pageOfTotal, formattedPageOfTotal } = usePositionFormat()

	return (
		<>
			{/* Controls hidden: Page only */}
			{!preferMinimalReader && !showControls && (
				<Animated.View
					className="absolute w-full items-center justify-center"
					entering={ENTERING_ANIMATION}
					exiting={EXITING_ANIMATION}
				>
					<Animated.View key={page} entering={FADE_IN} exiting={FADE_OUT}>
						<Text className="font-medium opacity-50" style={{ color: colors?.foreground }}>
							{page}
						</Text>
					</Animated.View>
				</Animated.View>
			)}

			{/* Controls shown: Page out of total */}
			{showControls && (
				<Animated.View
					className="absolute w-full items-center justify-center"
					entering={ENTERING_ANIMATION}
					exiting={EXITING_ANIMATION}
				>
					<JumpButton />

					<Animated.View key={page} entering={FADE_IN} exiting={FADE_OUT}>
						<Text className="font-medium opacity-50" style={{ color: colors?.foreground }}>
							{preferMinimalReader ? formattedPageOfTotal : pageOfTotal}
						</Text>
					</Animated.View>
				</Animated.View>
			)}
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
