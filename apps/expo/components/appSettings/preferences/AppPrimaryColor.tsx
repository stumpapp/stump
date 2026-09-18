import { TrueSheet } from '@lodev09/react-native-true-sheet'
import { Pipette } from 'lucide-react-native'
import { useRef, useState } from 'react'
import { Pressable, ScrollView, View } from 'react-native'
import tailwindColors from 'tailwindcss/colors'
import { useShallow } from 'zustand/react/shallow'

import { useGridItemSize } from '~/components/listLayout/grid/useGridItemSize'
import { SheetBackDetection } from '~/components/SheetBackDetection'
import { Text } from '~/components/ui'
import { HUES, reduceChroma, SETTINGS_COLORS, Shade, useColors } from '~/lib/constants'
import { useTranslate } from '~/lib/hooks'
import { useColorScheme } from '~/lib/useColorScheme'
import { usePreferencesStore } from '~/stores'

import AppSettingsRow from '../AppSettingsRow'

export default function AppPrimaryColor() {
	const { t } = useTranslate()
	const { isDarkColorScheme } = useColorScheme()
	const colors = useColors()

	const { accentHue, accentChromaScale, patch } = usePreferencesStore(
		useShallow((state) => ({
			accentHue: state.accentHue,
			accentChromaScale: state.accentChromaScale,
			patch: state.patch,
		})),
	)

	const palette = tailwindColors[accentHue]

	const sheetRef = useRef<TrueSheet>(null)
	const [isOpen, setIsOpen] = useState(false)

	const { itemWidth } = useGridItemSize({
		horizontalGap: 14,
		padding: 28,
	})

	return (
		<>
			<AppSettingsRow
				icon={Pipette}
				iconBackgroundColor={SETTINGS_COLORS.majorVisuals}
				title={t(getKey('label'))}
			>
				<Pressable
					className="w-36 h-8 squircle flex-row rounded-full active:opacity-80"
					onPress={() => sheetRef.current?.present()}
				>
					{ACCENT_SHADES.map((shade) => (
						<View
							key={shade}
							className="flex-1"
							style={{ backgroundColor: reduceChroma(palette[shade], accentChromaScale) }}
						/>
					))}
					<View className="squircle inset-0 border-accent-500/10 absolute rounded-full border" />
				</Pressable>
			</AppSettingsRow>
			<TrueSheet
				ref={sheetRef}
				detents={[0.6]}
				grabber
				scrollable
				backgroundColor={colors.sheet.background}
				grabberOptions={{ color: colors.sheet.grabber }}
				onDidPresent={() => setIsOpen(true)}
				onDidDismiss={() => setIsOpen(false)}
				insetAdjustment="automatic"
			>
				<ScrollView contentContainerClassName="px-4 py-6">
					<View className="mb-4 gap-2 p-3 squircle bg-accent-100 dark:bg-accent-950 items-center rounded-3xl">
						<Text
							className="font-bold text-lg"
							style={{
								color: reduceChroma(palette[isDarkColorScheme ? 400 : 600], accentChromaScale),
							}}
						>
							{t(getKey('options.chromaScale'))}
						</Text>
						<View className="gap-2 flex-row justify-center">
							{CHROMA_SCALES.map((scale) => {
								const isSelected = accentChromaScale === scale
								const color = reduceChroma(palette[500], scale)

								return (
									<Pressable
										key={scale}
										onPress={() => patch({ accentChromaScale: scale })}
										className="py-1 max-w-[80px] flex-1 justify-center active:opacity-60"
									>
										<View
											className="inset-0 squircle absolute rounded-full"
											style={{
												backgroundColor: isSelected ? undefined : color,
												borderColor: isSelected ? color : undefined,
												borderWidth: isSelected ? 2 : undefined,
											}}
										/>

										<Text
											className="font-semibold text-center"
											style={{
												color: isSelected ? reduceChroma(palette[500], scale) : 'white',
											}}
										>
											{scale.toFixed(1)}
										</Text>
									</Pressable>
								)
							})}
						</View>
					</View>

					<View className="gap-4 flex-row flex-wrap justify-center">
						{HUES.map((hue) => {
							const palette = tailwindColors[hue]
							const isSelected = accentHue === hue
							return (
								<Pressable
									key={hue}
									onPress={() => patch({ accentHue: hue })}
									style={{ width: itemWidth }}
									className="p-3 gap-2 rounded-2xl active:opacity-60"
								>
									<View
										className="inset-0 squircle absolute rounded-3xl"
										style={[
											{
												backgroundColor: reduceChroma(
													palette[isDarkColorScheme ? 950 : 100],
													accentChromaScale,
												),
											},
											isSelected && {
												borderColor: reduceChroma(palette[500], accentChromaScale),
												borderWidth: 2,
											},
										]}
									/>
									<Text
										className="font-bold text-center"
										style={{
											color: reduceChroma(
												palette[isDarkColorScheme ? 400 : 600],
												accentChromaScale,
											),
										}}
									>
										{t(getKey(`options.hues.${hue}`))}
									</Text>

									<View className="h-6 squircle flex-row rounded-lg">
										{PREVIEW_SHADES.map((shade) => (
											<View
												key={shade}
												style={{ backgroundColor: reduceChroma(palette[shade], accentChromaScale) }}
												// I noticed there can sometimes be a small (probably sub-pixel) gap, so the scale helps remove it
												className="flex-1 scale-x-105"
											/>
										))}
									</View>
								</Pressable>
							)
						})}
					</View>
				</ScrollView>
			</TrueSheet>
			<SheetBackDetection ref={sheetRef} isOpen={isOpen} />
		</>
	)
}

const ACCENT_SHADES = [100, 300, 500, 700, 900] satisfies Shade[]
const PREVIEW_SHADES = [300, 400, 600, 700] satisfies Shade[]
const CHROMA_SCALES = [0.4, 0.6, 0.8, 1.0, 1.2, 1.4]

const LOCALE_KEY = 'settings.preferences.appPrimaryColor'
const getKey = (key: string) => `${LOCALE_KEY}.${key}`
