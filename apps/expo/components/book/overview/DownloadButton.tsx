import { ArrowDown, Check, X } from 'lucide-react-native'
import { useCallback, useEffect, useRef, useState } from 'react'
import Animated, {
	Easing,
	Extrapolation,
	FadeOut,
	interpolate,
	useAnimatedStyle,
	useSharedValue,
	withTiming,
} from 'react-native-reanimated'

import { Button, Text } from '~/components/ui'
import { Icon } from '~/components/ui/icon'
import { useDownloadQueue, useIsBookDownloaded, useIsBookDownloading } from '~/lib/hooks'
import { usePreferencesStore } from '~/stores'

type DownloadState = 'downloading' | 'completed'

const FADE_DURATION = 350
const COMPLETION_LINGER_MS = 1500

type DownloadButtonProps = {
	bookId: string
	serverId: string
	onDownload: () => void
}

export default function DownloadButton({ bookId, serverId, onDownload }: DownloadButtonProps) {
	const isDownloading = useIsBookDownloading(bookId)
	const isDownloaded = useIsBookDownloaded(bookId, serverId)

	const accentColor = usePreferencesStore((state) => state.accentColor)

	const { activeItems, cancel } = useDownloadQueue({ serverId })

	const activeDownload = activeItems.find((item) => item.bookId === bookId)
	const downloadPercentage = activeDownload?.progress?.percentage ?? 0

	const progress = useSharedValue(0)
	const contentOpacity = useSharedValue(1)

	const wasDownloadingRef = useRef(false)
	const wasCancelledRef = useRef(false)
	const prevIsDownloadedRef = useRef(isDownloaded)

	const [downloadState, setDownloadState] = useState<DownloadState | undefined>(() => {
		if (isDownloaded) return 'completed'
		if (isDownloading) return 'downloading'
		return undefined
	})

	// Note: I don't _love_ having to dup the state but couldn't get it quite right without doing so
	const [displayedState, setDisplayedState] = useState(downloadState)
	const [visible, setVisible] = useState(!isDownloaded)

	useEffect(() => {
		const wasDownloaded = prevIsDownloadedRef.current
		prevIsDownloadedRef.current = isDownloaded

		if (!wasDownloaded && isDownloaded) {
			if (downloadState === undefined) {
				setVisible(false)
			}
		} else if (wasDownloaded && !isDownloaded) {
			wasDownloadingRef.current = false
			setDownloadState(undefined)
			setDisplayedState(undefined)
			setVisible(true)
		}
	}, [isDownloaded, downloadState])

	useEffect(() => {
		if (isDownloading) {
			wasDownloadingRef.current = true
			wasCancelledRef.current = false
			setDownloadState('downloading')
		} else if (wasDownloadingRef.current && !isDownloading) {
			wasDownloadingRef.current = false
			if (wasCancelledRef.current) {
				wasCancelledRef.current = false
				setDownloadState(undefined)
			} else {
				setDownloadState('completed')
			}
		}
	}, [isDownloading])

	useEffect(() => {
		if (displayedState === downloadState) return

		if (displayedState === 'downloading' && downloadState === 'completed') {
			contentOpacity.value = withTiming(0, { duration: FADE_DURATION })

			const timer = setTimeout(() => {
				setDisplayedState(downloadState)
				contentOpacity.value = withTiming(1, { duration: FADE_DURATION })
			}, FADE_DURATION)

			return () => clearTimeout(timer)
		}

		setDisplayedState(downloadState)
		contentOpacity.value = 1
	}, [downloadState, displayedState, contentOpacity])

	useEffect(() => {
		if (downloadState !== 'completed' || !visible) return

		// Note: I found it looked better to linger just a little bit after completion before
		// starting the fade out
		const timer = setTimeout(() => {
			setVisible(false)
		}, FADE_DURATION + COMPLETION_LINGER_MS)
		return () => clearTimeout(timer)
	}, [downloadState, visible])

	useEffect(() => {
		if (downloadState === 'completed') {
			progress.value = withTiming(100, { duration: 300, easing: Easing.out(Easing.quad) })
		} else if (downloadState === undefined) {
			progress.value = 0
		} else {
			// Note: The timing here helps smooth out jitters a bit, I found it a little hard to get right to be honest
			// but I think this looks alright
			progress.value = withTiming(downloadPercentage, {
				duration: 350,
				easing: Easing.out(Easing.quad),
			})
		}
	}, [downloadPercentage, downloadState, progress])

	const progressBarStyle = useAnimatedStyle(() => ({
		width: `${interpolate(progress.value, [0, 100], [0, 100], Extrapolation.CLAMP)}%`,
	}))

	const contentStyle = useAnimatedStyle(() => ({
		opacity: contentOpacity.value,
	}))

	const isCompleted = displayedState === 'completed'

	const onPress = useCallback(() => {
		if (isCompleted) return

		if (downloadState === 'downloading' && activeDownload) {
			wasCancelledRef.current = true
			cancel(activeDownload.id)
		} else if (downloadState === undefined) {
			onDownload()
		}
	}, [downloadState, activeDownload, cancel, onDownload, isCompleted])

	if (!visible) return null

	const isActive = displayedState === 'downloading'

	const iconComponent = isCompleted ? Check : isActive ? X : ArrowDown
	const label = isCompleted ? 'Downloaded' : isActive ? 'Cancel' : 'Download'

	return (
		<Animated.View exiting={FadeOut.duration(300)}>
			<Button
				variant="secondary"
				roundness="full"
				onPress={onPress}
				className="native:px-0 w-36 flex-row gap-2 overflow-hidden"
			>
				{(isActive || isCompleted) && (
					<Animated.View
						style={[progressBarStyle, { backgroundColor: accentColor }]}
						className="absolute inset-0 opacity-25"
					/>
				)}

				<Animated.View style={contentStyle} className="flex-row items-center gap-2">
					<Icon
						as={iconComponent}
						style={{
							// @ts-expect-error: It's fine
							color: accentColor,
						}}
						size={20}
						className="-ml-1"
					/>
					<Text className="font-medium">{label}</Text>
				</Animated.View>
			</Button>
		</Animated.View>
	)
}
