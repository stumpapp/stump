import Slider from '@react-native-community/slider'
import * as Haptics from 'expo-haptics'
import { useCallback, useState } from 'react'
import { View } from 'react-native'

import { Heading, Label, RadioGroup, RadioGroupItem, Switch, Text } from '~/components/ui'
import { useColors } from '~/lib/constants'
import { TextAlignment } from '~/modules/readium'
import { useReaderStore } from '~/stores'

const TEXT_ALIGN_OPTIONS: { label: string; value: TextAlignment }[] = [
	{ label: 'Start', value: 'start' },
	{ label: 'Left', value: 'left' },
	{ label: 'Center', value: 'center' },
	{ label: 'Right', value: 'right' },
	{ label: 'Justify', value: 'justify' },
]

type SliderSettingProps = {
	label: string
	value: number
	defaultValue: number
	min: number
	max: number
	step: number
	unit?: string
	onChange: (value: number | undefined) => void
}

function SliderSetting({
	label,
	value,
	defaultValue,
	min,
	max,
	step,
	unit = '',
	onChange,
}: SliderSettingProps) {
	const colors = useColors()
	const [localValue, setLocalValue] = useState(value)

	const handleComplete = useCallback(
		(val: number) => {
			setLocalValue(val)
			// If value is at default, set to undefined to use system default
			onChange(val === defaultValue ? undefined : val)
		},
		[onChange, defaultValue],
	)

	const displayValue = unit === '%' ? Math.round(localValue * 100) : localValue.toFixed(1)

	return (
		<View className="flex-row items-center gap-2">
			<Text className="w-24 text-foreground">{label}</Text>
			<Text className="w-14 text-right text-foreground-muted">
				{displayValue}
				{unit}
			</Text>
			<View className="flex-1">
				<Slider
					style={{ width: '100%', height: 40 }}
					minimumValue={min}
					maximumValue={max}
					value={localValue}
					minimumTrackTintColor={colors.edge.DEFAULT}
					maximumTrackTintColor={colors.edge.DEFAULT}
					step={step}
					onValueChange={(val) => {
						setLocalValue(val)
						Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
					}}
					onSlidingComplete={handleComplete}
				/>
			</View>
		</View>
	)
}

type ToggleSettingProps = {
	label: string
	value: boolean | undefined
	onChange: (value: boolean | undefined) => void
}

function ToggleSetting({ label, value, onChange }: ToggleSettingProps) {
	return (
		<View className="flex-row items-center justify-between py-2">
			<Label onPress={() => onChange(value === undefined ? true : !value)}>{label}</Label>
			<Switch
				checked={value ?? false}
				onCheckedChange={(checked) => onChange(checked ? true : undefined)}
				accessibilityLabel={`Toggle ${label}`}
			/>
		</View>
	)
}

export default function TypographySettings() {
	const store = useReaderStore((state) => ({
		allowPublisherStyles: state.globalSettings.allowPublisherStyles ?? true,
		textAlign: state.globalSettings.textAlign ?? 'justify',
		typeScale: state.globalSettings.typeScale ?? 1.0,
		lineHeight: state.globalSettings.lineHeight ?? 1.5,
		paragraphIndent: state.globalSettings.paragraphIndent,
		paragraphSpacing: state.globalSettings.paragraphSpacing,
		wordSpacing: state.globalSettings.wordSpacing,
		letterSpacing: state.globalSettings.letterSpacing,
		hyphens: state.globalSettings.hyphens,
		ligatures: state.globalSettings.ligatures,
		setSettings: state.setGlobalSettings,
	}))

	// If publisher styles are enabled, don't show typography settings
	if (store.allowPublisherStyles) {
		return null
	}

	return (
		<View className="gap-4">
			<Heading className="pl-4">Typography</Heading>

			{/* Text Alignment */}
			<View className="gap-2 px-6">
				<Text className="text-foreground">Text Alignment</Text>
				<RadioGroup
					value={store.textAlign}
					onValueChange={(value) => store.setSettings({ textAlign: value as TextAlignment })}
					className="flex-row flex-wrap gap-4"
				>
					{TEXT_ALIGN_OPTIONS.map((option) => (
						<View key={option.value} className="flex-row items-center gap-2">
							<RadioGroupItem value={option.value} />
							<Label htmlFor={option.value}>{option.label}</Label>
						</View>
					))}
				</RadioGroup>
			</View>

			{/* Sliders */}
			<View className="gap-1 px-6">
				<SliderSetting
					label="Type Scale"
					value={store.typeScale}
					defaultValue={1.0}
					min={0.5}
					max={2.0}
					step={0.1}
					onChange={(value) => store.setSettings({ typeScale: value })}
				/>

				<SliderSetting
					label="Line Height"
					value={store.lineHeight}
					defaultValue={1.5}
					min={1.0}
					max={3.0}
					step={0.1}
					onChange={(value) => store.setSettings({ lineHeight: value })}
				/>

				<SliderSetting
					label="Para. Indent"
					value={store.paragraphIndent ?? 0}
					defaultValue={0}
					min={0}
					max={3.0}
					step={0.25}
					onChange={(value) => store.setSettings({ paragraphIndent: value })}
				/>

				<SliderSetting
					label="Para. Spacing"
					value={store.paragraphSpacing ?? 0}
					defaultValue={0}
					min={0}
					max={3.0}
					step={0.25}
					onChange={(value) => store.setSettings({ paragraphSpacing: value })}
				/>

				<SliderSetting
					label="Word Spacing"
					value={store.wordSpacing ?? 0}
					defaultValue={0}
					min={0}
					max={1.0}
					step={0.05}
					onChange={(value) => store.setSettings({ wordSpacing: value })}
				/>

				<SliderSetting
					label="Letter Spacing"
					value={store.letterSpacing ?? 0}
					defaultValue={0}
					min={0}
					max={0.5}
					step={0.025}
					onChange={(value) => store.setSettings({ letterSpacing: value })}
				/>
			</View>

			{/* Toggles */}
			<View className="px-6">
				<ToggleSetting
					label="Hyphens"
					value={store.hyphens}
					onChange={(value) => store.setSettings({ hyphens: value })}
				/>

				<ToggleSetting
					label="Ligatures"
					value={store.ligatures}
					onChange={(value) => store.setSettings({ ligatures: value })}
				/>
			</View>
		</View>
	)
}
