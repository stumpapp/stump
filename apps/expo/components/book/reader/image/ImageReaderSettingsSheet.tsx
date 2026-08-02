import { TrueSheet, TrueSheetProps } from '@lodev09/react-native-true-sheet'
import { useContext, useEffect, useRef, useState } from 'react'
import { View } from 'react-native'
import Animated, {
	interpolateColor,
	useAnimatedStyle,
	useSharedValue,
	withTiming,
} from 'react-native-reanimated'

import { SheetBackDetection } from '~/components/SheetBackDetection'
import { Heading, Switch, Text } from '~/components/ui'
import { IS_IOS_26_PLUS, useColors, usePalette } from '~/lib/constants'
import { useTranslate } from '~/lib/hooks'
import { useReaderStore } from '~/stores'

import { ReaderSettings } from '../settings'
import { FADE_TIMING_CONFIG } from '../shared'
import { ImageBasedReaderContext } from './context'

export default function ImageReaderSettingsSheet(props: TrueSheetProps) {
	const context = useContext(ImageBasedReaderContext)
	const { t } = useTranslate()
	const colors = useColors()

	const accentColor = usePalette({ light: 300, dark: 900, opacity: 0.4 })

	const bookOverrides = useReaderStore((state) => state.bookOverrides)
	const setBookOverride = useReaderStore((state) => state.setBookOverride)

	const ref = useRef<TrueSheet | null>(null)

	const bookId = context?.book?.id
	const serverId = context?.serverId
	const overrideGlobalSettings = !!(bookId ? bookOverrides[bookId] : false)

	const bgOpacity = useSharedValue(0)

	useEffect(() => {
		bgOpacity.value = withTiming(overrideGlobalSettings ? 1 : 0, FADE_TIMING_CONFIG)
	}, [overrideGlobalSettings, bgOpacity])

	const animatedScrollViewStyle = useAnimatedStyle(() => {
		return {
			// add a slight tint if global settings are not used
			// this visually helps to confirm the switch did something if no settings change
			backgroundColor: interpolateColor(bgOpacity.value, [0, 1], ['transparent', accentColor]),
		}
	})

	const [isOpen, setIsOpen] = useState(false)

	return (
		<>
			<TrueSheet
				name="imageReaderSettings"
				ref={ref}
				detents={[0.5, 1]}
				grabber
				scrollable
				backgroundColor={IS_IOS_26_PLUS ? undefined : colors.sheet.background}
				grabberOptions={{ color: colors.sheet.grabber }}
				insetAdjustment="automatic"
				{...props}
				onDidPresent={() => setIsOpen(true)}
				onDidDismiss={() => setIsOpen(false)}
			>
				<Animated.ScrollView
					className="p-6 flex-1"
					contentContainerStyle={{ alignItems: 'flex-start' }}
					nestedScrollEnabled
					style={animatedScrollViewStyle}
				>
					<View className="gap-8 w-full flex-1">
						<View className="flex flex-row items-center justify-between">
							<Heading size="lg">{t('common.settings')}</Heading>

							{!!context && (
								<View className="gap-1 flex-row items-center">
									<Text className="text-foreground-muted">
										{t('readerSettings.overrideGlobalSettings')}
									</Text>
									<Switch
										checked={overrideGlobalSettings}
										onCheckedChange={(checked) => {
											if (bookId) {
												setBookOverride(bookId, checked)
											}
										}}
									/>
								</View>
							)}
						</View>

						<ReaderSettings
							{...(overrideGlobalSettings && bookId && serverId
								? {
										forBook: bookId,
										forServer: serverId,
									}
								: {})}
						/>
					</View>
				</Animated.ScrollView>
			</TrueSheet>

			<SheetBackDetection ref={ref} isOpen={isOpen} />
		</>
	)
}
