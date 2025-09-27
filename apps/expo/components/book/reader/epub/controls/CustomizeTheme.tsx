import { Fragment, useEffect, useState } from 'react'
import { View } from 'react-native'
import { Pressable } from 'react-native-gesture-handler'
import ColorPicker, { HueSlider, OpacitySlider, Panel1 } from 'reanimated-color-picker'

import { Checkbox, Input, Label, Tabs, Text } from '~/components/ui'
import { useColorScheme } from '~/lib/useColorScheme'
import { resolveTheme, resolveThemeName, StoredConfig, useEpubThemesStore } from '~/stores/epub'

type Props = {
	onCancel: () => void
}

type Color = keyof NonNullable<StoredConfig['colors']>

export default function CustomizeTheme({ onCancel }: Props) {
	const { colorScheme } = useColorScheme()
	const { themes, selectedTheme } = useEpubThemesStore((store) => ({
		themes: store.themes,
		selectedTheme: store.selectedTheme,
	}))

	const [customTheme, setCustomTheme] = useState(() =>
		resolveTheme(themes, selectedTheme || '', colorScheme),
	)

	const [editingColor, setEditingColor] = useState<Color>('background')
	const [isSavingAsNewTheme, setIsSavingAsNewTheme] = useState(false)
	const [name, setName] = useState(() => resolveThemeName(themes, selectedTheme || '', colorScheme))

	useEffect(
		() => {
			setCustomTheme(resolveTheme(themes, selectedTheme || '', colorScheme))
			setName(resolveThemeName(themes, selectedTheme || '', colorScheme))
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[selectedTheme],
	)

	const onChangeColor = (value: string) => {
		if (!editingColor) return
		// @ts-expect-error: Its fine
		setCustomTheme((theme) => ({
			...theme,
			colors: {
				...theme.colors,
				[editingColor]: value,
			},
		}))
	}

	const handleCancel = () => {
		onCancel()
		setCustomTheme(resolveTheme(themes, selectedTheme || '', colorScheme))
	}

	return (
		<Fragment>
			<View
				style={{
					height: 228,
					backgroundColor: customTheme.colors?.background,
				}}
			>
				<View className="h-12 flex-row items-center justify-between px-2">
					<Pressable onPress={handleCancel}>
						{({ pressed }) => (
							<Text
								className="text-lg"
								style={{ color: customTheme.colors?.foreground, opacity: pressed ? 0.6 : 1 }}
							>
								Cancel
							</Text>
						)}
					</Pressable>

					<Pressable>
						{({ pressed }) => (
							<Text
								className="text-lg font-medium"
								style={{ color: customTheme.colors?.foreground, opacity: pressed ? 0.6 : 1 }}
							>
								Done
							</Text>
						)}
					</Pressable>
				</View>

				<View className="gap-2 px-6 py-4">
					<Text
						style={{
							color: customTheme.colors?.foreground,
							fontSize: 32,
							lineHeight: 32,
						}}
					>
						Aa
					</Text>

					<Text
						style={{
							color: customTheme.colors?.foreground,
							fontSize: 24,
							lineHeight: 32,
						}}
						numberOfLines={3}
					>
						{DEMO_TEXT}
					</Text>
				</View>
			</View>

			<View className="gap-4 px-4">
				<View className="flex-row items-center justify-center gap-4">
					<View className="flex-row items-center justify-center gap-2">
						<Checkbox
							checked={isSavingAsNewTheme}
							onCheckedChange={(checked) => setIsSavingAsNewTheme(!!checked)}
						/>

						<Label>Save as new theme</Label>
					</View>

					<View className="flex-1">
						<Input value={name} onChangeText={setName} placeholder="Theme name" />
					</View>
				</View>

				<View className="flex-row">
					<Tabs value={editingColor} onValueChange={(value) => setEditingColor(value as Color)}>
						<Tabs.List className="flex-row">
							<Tabs.Trigger value="background">
								<Text>Background</Text>
							</Tabs.Trigger>

							<Tabs.Trigger value="foreground">
								<Text>Text</Text>
							</Tabs.Trigger>
						</Tabs.List>
					</Tabs>
				</View>

				<ColorPicker
					value={customTheme.colors?.[editingColor]}
					onChangeJS={(value) => onChangeColor(value.hex)}
				>
					<View className="pb-4">
						<Panel1 />
					</View>

					<View className="gap-4 px-2 pb-4">
						<Text>Opacity</Text>
						<OpacitySlider />
					</View>

					<View className="gap-4 px-2 pb-4">
						<Text>Hue</Text>
						<HueSlider />
					</View>
				</ColorPicker>
			</View>
		</Fragment>
	)
}

const DEMO_TEXT = `Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.`
