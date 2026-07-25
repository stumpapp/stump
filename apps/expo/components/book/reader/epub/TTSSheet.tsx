import { TrueSheet, TrueSheetProps } from '@lodev09/react-native-true-sheet'
import { useState } from 'react'
import { Pressable, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useShallow } from 'zustand/shallow'

import { SheetBackDetection } from '~/components/SheetBackDetection'
import { Stepper, Text } from '~/components/ui'
import { IS_IOS_26_PLUS, useColors } from '~/lib/constants'
import { cn } from '~/lib/utils'
import { useEpubSheetStore } from '~/stores/epubSheet'
import { useTTSStore } from '~/stores/tts'

import { useEpubReaderContext } from './context'

const SPEED_PRESETS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2]

function isPresetActive(preset: number, current: number) {
	// account for floating point precision issues
	return Math.round(preset * 100) / 100 === Math.round(current * 100) / 100
}

export default function TTSSheet(props: TrueSheetProps) {
	const sheetRef = useEpubSheetStore((state) => state.ttsSheetRef)
	const context = useEpubReaderContext()

	const { speechSpeed, setSpeechSpeed } = useTTSStore(
		useShallow((state) => ({
			speechSpeed: state.speechSpeed,
			setSpeechSpeed: state.setSpeechSpeed,
		})),
	)

	const colors = useColors()
	const insets = useSafeAreaInsets()

	const [isOpen, setIsOpen] = useState(false)
	const [localSpeed, setLocalSpeed] = useState(speechSpeed)

	const readerRef = context?.readerRef

	const handlePresetPress = (value: number) => {
		setSpeechSpeed(value)
		setLocalSpeed(value)
		readerRef?.setTTSSpeed(value)
	}

	const onStepperChange = (value: number) => {
		setSpeechSpeed(value)
		setLocalSpeed(value)
		readerRef?.setTTSSpeed(value)
	}

	// TODO: spacing is poopy, curate section better
	// TODO: max-w for tablet?
	// TODO: play/pause controls
	return (
		<>
			<TrueSheet
				name="tts"
				ref={sheetRef}
				detents={['auto']}
				dimmed={false}
				grabber
				backgroundColor={IS_IOS_26_PLUS ? undefined : colors.sheet.background}
				grabberOptions={{ color: colors.sheet.grabber }}
				style={{ paddingBottom: insets.bottom }}
				insetAdjustment="automatic"
				{...props}
				onDidPresent={() => {
					setLocalSpeed(speechSpeed)
					setIsOpen(true)
				}}
				onDidDismiss={() => setIsOpen(false)}
			>
				<View className="p-6 gap-6">
					{/*TODO: play/pause controls?*/}

					<View className="gap-3">
						<Text className="font-medium">localizemeplz</Text>

						<Stepper
							value={localSpeed}
							onChange={(val) => onStepperChange(val)}
							min={0.25}
							max={2.0}
							step={0.05}
							formatValue={(val) => Math.round(val * 100) / 100 + 'x'}
						/>

						<View className="gap-2 flex-row flex-wrap">
							{SPEED_PRESETS.map((preset) => {
								const active = isPresetActive(preset, localSpeed)
								return (
									<Pressable
										key={preset}
										onPress={() => handlePresetPress(preset)}
										className={cn(
											'px-3 py-1.5 border-black/20 dark:border-white/20 flex-grow rounded-full border',
											{ 'bg-accent-500 border-accent-500': active },
										)}
									>
										<Text
											className={cn(
												'text-sm flex-grow',
												active ? 'text-white font-medium' : 'text-foreground',
											)}
										>
											{preset}x
										</Text>
									</Pressable>
								)
							})}
						</View>
					</View>
				</View>
			</TrueSheet>

			<SheetBackDetection ref={sheetRef} isOpen={isOpen} />
		</>
	)
}
