import { View } from 'react-native'

import { Label, Stepper, Switch, Text } from '~/components/ui'
import { Picker } from '~/components/ui/picker/picker'
import type { PickerOption } from '~/components/ui/picker/types'
import { cn } from '~/lib/utils'
import { TextAlignment } from '~/modules/readium'
import { useReaderStore } from '~/stores'

const TEXT_ALIGN_OPTIONS: PickerOption<TextAlignment>[] = [
	{ label: 'Start', value: 'start' },
	{ label: 'Left', value: 'left' },
	{ label: 'Center', value: 'center' },
	{ label: 'Right', value: 'right' },
	{ label: 'Justify', value: 'justify' },
]

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

	const isDisabled = store.allowPublisherStyles

	return (
		<View>
			<View className="flex-row items-center justify-between px-6 py-3">
				<Text className={cn('text-lg text-foreground', isDisabled && 'opacity-40')}>
					Text Alignment
				</Text>
				<Picker
					value={store.textAlign}
					options={TEXT_ALIGN_OPTIONS}
					onValueChange={(value) => store.setSettings({ textAlign: value })}
					disabled={isDisabled}
				/>
			</View>

			<View className="h-px w-full bg-edge" />

			<View className="flex-row items-center justify-between px-6 py-3">
				<Text className={cn('text-lg text-foreground', isDisabled && 'opacity-40')}>
					Type Scale
				</Text>
				<Stepper
					value={store.typeScale}
					onChange={(val) => store.setSettings({ typeScale: val === 1.0 ? undefined : val })}
					min={0.5}
					max={2.0}
					step={0.1}
					disabled={isDisabled}
					formatValue={(val) => val.toFixed(1)}
					accessibilityLabel="Type Scale"
				/>
			</View>

			<View className="h-px w-full bg-edge" />

			<View className="flex-row items-center justify-between px-6 py-3">
				<Text className={cn('text-lg text-foreground', isDisabled && 'opacity-40')}>
					Line Height
				</Text>
				<Stepper
					value={store.lineHeight}
					onChange={(val) => store.setSettings({ lineHeight: val === 1.5 ? undefined : val })}
					min={1.0}
					max={3.0}
					step={0.1}
					disabled={isDisabled}
					formatValue={(val) => val.toFixed(1)}
					accessibilityLabel="Line Height"
				/>
			</View>

			<View className="h-px w-full bg-edge" />

			<View className="flex-row items-center justify-between px-6 py-3">
				<Text className={cn('text-lg text-foreground', isDisabled && 'opacity-40')}>
					Paragraph Indent
				</Text>
				<Stepper
					value={store.paragraphIndent ?? 0}
					onChange={(val) => store.setSettings({ paragraphIndent: val === 0 ? undefined : val })}
					min={0}
					max={3.0}
					step={0.25}
					disabled={isDisabled}
					unit="%"
					formatValue={(val) => Math.round(val * 100).toString()}
					accessibilityLabel="Paragraph Indent"
				/>
			</View>

			<View className="h-px w-full bg-edge" />

			<View className="flex-row items-center justify-between px-6 py-3">
				<Text className={cn('text-lg text-foreground', isDisabled && 'opacity-40')}>
					Paragraph Spacing
				</Text>
				<Stepper
					value={store.paragraphSpacing ?? 0}
					onChange={(val) => store.setSettings({ paragraphSpacing: val === 0 ? undefined : val })}
					min={0}
					max={3.0}
					step={0.25}
					disabled={isDisabled}
					unit="%"
					formatValue={(val) => Math.round(val * 100).toString()}
					accessibilityLabel="Paragraph Spacing"
				/>
			</View>

			<View className="h-px w-full bg-edge" />

			<View className="flex-row items-center justify-between px-6 py-3">
				<Text className={cn('text-lg text-foreground', isDisabled && 'opacity-40')}>
					Word Spacing
				</Text>
				<Stepper
					value={store.wordSpacing ?? 0}
					onChange={(val) => store.setSettings({ wordSpacing: val === 0 ? undefined : val })}
					min={0}
					max={1.0}
					step={0.05}
					disabled={isDisabled}
					unit="%"
					formatValue={(val) => Math.round(val * 100).toString()}
					accessibilityLabel="Word Spacing"
				/>
			</View>

			<View className="h-px w-full bg-edge" />

			<View className="flex-row items-center justify-between px-6 py-3">
				<Text className={cn('text-lg text-foreground', isDisabled && 'opacity-40')}>
					Letter Spacing
				</Text>
				<Stepper
					value={store.letterSpacing ?? 0}
					onChange={(val) => store.setSettings({ letterSpacing: val === 0 ? undefined : val })}
					min={0}
					max={0.5}
					step={0.025}
					disabled={isDisabled}
					unit="%"
					formatValue={(val) => Math.round(val * 100).toString()}
					accessibilityLabel="Letter Spacing"
				/>
			</View>

			<View className="h-px w-full bg-edge" />

			<View className="flex-row items-center justify-between px-6 py-3">
				<Label
					className={cn(isDisabled && 'opacity-40', 'text-lg')}
					onPress={() =>
						!isDisabled &&
						store.setSettings({ hyphens: store.hyphens === undefined ? true : !store.hyphens })
					}
				>
					Hyphens
				</Label>
				<Switch
					checked={store.hyphens ?? false}
					onCheckedChange={(checked) => store.setSettings({ hyphens: checked ? true : undefined })}
					accessibilityLabel="Toggle Hyphens"
					disabled={isDisabled}
				/>
			</View>

			<View className="h-px w-full bg-edge" />

			<View className="flex-row items-center justify-between px-6 py-3">
				<Text
					className={cn(isDisabled && 'opacity-40', 'text-lg')}
					onPress={() =>
						!isDisabled &&
						store.setSettings({
							ligatures: store.ligatures === undefined ? true : !store.ligatures,
						})
					}
				>
					Ligatures
				</Text>

				<Switch
					checked={store.ligatures ?? false}
					onCheckedChange={(checked) =>
						store.setSettings({ ligatures: checked ? true : undefined })
					}
					accessibilityLabel="Toggle Ligatures"
					disabled={isDisabled}
				/>
			</View>
		</View>
	)
}
