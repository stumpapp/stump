import Octicons from '@react-native-vector-icons/octicons'
import { formatNarrowDuration } from '@stump/i18n'
import { GlassView } from 'expo-glass-effect'
import { List, Menu, Palette, PencilLine } from 'lucide-react-native'
import { cssInterop } from 'nativewind'
import { useEffect, useState } from 'react'
import { Platform, Pressable, View } from 'react-native'
import Animated, {
	interpolate,
	useAnimatedStyle,
	useSharedValue,
	withSpring,
} from 'react-native-reanimated'

import {
	ENTERING_ANIMATION,
	EXITING_ANIMATION,
	FADE_IN,
	FADE_OUT,
	useReaderAnimations,
} from '~/components/book/reader/shared'
import { Icon, Text } from '~/components/ui'
import { IS_IOS_26_PLUS } from '~/lib/constants'
import { useTranslate } from '~/lib/hooks'
import { cn } from '~/lib/utils'
import { usePreferencesStore, useReaderStore } from '~/stores'
import { useEpubLocationStore, useEpubTheme } from '~/stores/epub'
import { useEpubSheetStore } from '~/stores/epubSheet'

import { useEpubReaderContext } from './context'
import JumpButton from './JumpButton'
import { BookmarkMenuItem, MenuItem, useButtonColors } from './MenuItem'
import { useBookmark } from './useBookmark'

export const BUTTON_SIZE = Platform.OS === 'ios' ? 50 : 42
export const ICON_SCALE = 0.6
const SHRINK_SCALE = 0.9
const ICON_SIZE = BUTTON_SIZE * ICON_SCALE

cssInterop(GlassView, { className: { target: 'style' } })

export default function ReadiumFooter() {
	const showControls = useReaderStore((state) => state.showControls)
	const setShowControls = useReaderStore((state) => state.setShowControls)
	const openSheet = useEpubSheetStore((state) => state.openSheet)
	const { isDarkEpubTheme } = useEpubTheme()
	const buttonColors = useButtonColors()
	const { isBookmarked, disabled: bookmarkDisabled } = useBookmark()

	const [showMenu, setShowMenu] = useState(false)

	const { timer } = useEpubReaderContext()
	const { locale } = useTranslate()
	const [elapsedSeconds, setElapsedSeconds] = useState(0)
	const formattedReadTime = formatNarrowDuration(elapsedSeconds, { locale })

	const showBookmark = isBookmarked && !bookmarkDisabled
	const showMenuButton = (showControls || showBookmark) && !showMenu

	const progress = useSharedValue(showControls ? 1 : 0)

	useEffect(() => {
		progress.value = withSpring(showControls ? 1 : 0, {
			damping: 15,
			stiffness: 150,
			mass: 0.8,
		})
	}, [showControls, progress])

	// we split menuButtonStyle and menuButtonIconStyle (not using scale on menuButtonStyle)
	// because otherwise the bookmark will be very blurry during animation
	const menuButtonStyle = useAnimatedStyle(() => {
		const size = interpolate(progress.value, [0, 1], [BUTTON_SIZE * SHRINK_SCALE, BUTTON_SIZE])
		const offset = (BUTTON_SIZE - size) / 2
		if (!showBookmark) return {}
		return { width: size, height: size, top: offset, left: offset }
	})
	const menuButtonIconStyle = useAnimatedStyle(() => {
		const scale = interpolate(progress.value, [0, 1], [SHRINK_SCALE, 1])
		if (!showBookmark) return {}
		return { transform: [{ scale }] }
	})

	const bookmarkContainerStyle = useAnimatedStyle(() => {
		const size = interpolate(progress.value, [0, 1], [BUTTON_SIZE * SHRINK_SCALE, BUTTON_SIZE])
		const scale = interpolate(progress.value, [0, 1], [1, 0.5])
		const translateX = interpolate(progress.value, [0, 1], [0, 16])
		const translateY = -translateX

		return { width: size, height: size, transform: [{ translateX }, { translateY }, { scale }] }
	})

	return (
		<>
			{showMenu && (
				<Pressable
					className="inset-0 absolute z-30"
					onPress={() => {
						setShowMenu(false)
						timer.resume()
					}}
				>
					<Animated.View
						className={cn('flex-1', isDarkEpubTheme ? 'bg-black/50' : 'bg-black/20')}
						entering={ENTERING_ANIMATION}
						exiting={EXITING_ANIMATION}
					/>
				</Pressable>
			)}

			<View className="inset-x-safe mt-2 h-12 items-center justify-center">
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
						{/* The read time must take around half the width to display on one line for all locales */}
						<MenuItem label={formattedReadTime} show={showMenu} delay={0} className="flex-[2]" />
						<BookmarkMenuItem show={showMenu} delay={0} className="flex-1" />
					</View>
				</View>

				{showMenuButton && (
					<Animated.View
						entering={ENTERING_ANIMATION}
						exiting={EXITING_ANIMATION}
						className="right-6 absolute z-30"
						style={{ width: BUTTON_SIZE, height: BUTTON_SIZE }}
					>
						<Animated.View style={menuButtonStyle} className="inset-0 absolute">
							<GlassView
								className="flex-1 rounded-full"
								isInteractive
								colorScheme={isDarkEpubTheme ? 'dark' : 'light'}
								style={{ backgroundColor: buttonColors.controls.background }}
							>
								<Pressable
									onPress={() => {
										timer.pause()
										setElapsedSeconds(timer.getCurrentTime() || 0)
										setShowMenu(true)
										setShowControls(false)
									}}
									className={cn(
										'h-full w-full items-center justify-center',
										!IS_IOS_26_PLUS && 'active:opacity-60',
									)}
								>
									<Animated.View style={menuButtonIconStyle}>
										<Icon
											as={Menu}
											size={ICON_SIZE}
											absoluteStrokeWidth
											strokeWidth={2.5}
											color={buttonColors.controls.foreground}
										/>
									</Animated.View>
								</Pressable>

								{isBookmarked && !bookmarkDisabled && (
									<Animated.View
										style={bookmarkContainerStyle}
										className="top-0 right-0 border-white/10 bg-red-600 absolute items-center justify-center rounded-full border"
										pointerEvents="none"
									>
										<Octicons
											name="bookmark-filled"
											size={ICON_SIZE}
											color="#facc15" // yellow-400
											style={{ transform: [{ scaleX: 0.9 }] }}
										/>
									</Animated.View>
								)}
							</GlassView>
						</Animated.View>
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
