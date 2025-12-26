import { Fragment, useCallback, useEffect, useState } from 'react'
import { Alert, ScrollView, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import ColorPicker, { HueSlider, OpacitySlider, Panel1 } from 'reanimated-color-picker'

import { Checkbox, Input, Label, Tabs, Text } from '~/components/ui'
import { useColorScheme } from '~/lib/useColorScheme'
import {
	Color,
	resolveTheme,
	resolveThemeName,
	StoredConfig,
	useEpubThemesStore,
} from '~/stores/epub'

import { ThemeHeaderPreview } from './ThemeHeaderPreview'

type Props = {
	onCancel: () => void
	mode?: 'edit' | 'create'
}

const DEFAULT_THEMES = ['Light', 'Dark', 'Sepia']

const NEW_THEME_DEFAULTS: StoredConfig = {
	colors: {
		background: '#FFFFFF',
		foreground: '#000000',
	},
}

export default function CustomizeTheme({ onCancel, mode = 'edit' }: Props) {
	const { colorScheme } = useColorScheme()
	const insets = useSafeAreaInsets()

	const { themes, selectedTheme, addTheme, selectTheme, deleteTheme } = useEpubThemesStore(
		(store) => ({
			themes: store.themes,
			selectedTheme: store.selectedTheme,
			addTheme: store.addTheme,
			selectTheme: store.selectTheme,
			deleteTheme: store.deleteTheme,
		}),
	)

	const isCreateMode = mode === 'create'

	const [customTheme, setCustomTheme] = useState<StoredConfig>(() =>
		isCreateMode ? NEW_THEME_DEFAULTS : resolveTheme(themes, selectedTheme || '', colorScheme),
	)

	const [editingColor, setEditingColor] = useState<Color>('background')
	const [isSavingAsNewTheme, setIsSavingAsNewTheme] = useState(isCreateMode)
	const [name, setName] = useState(() =>
		isCreateMode ? '' : resolveThemeName(themes, selectedTheme || '', colorScheme),
	)

	const isDefaultTheme =
		!isCreateMode &&
		DEFAULT_THEMES.includes(resolveThemeName(themes, selectedTheme || '', colorScheme))

	useEffect(
		() => {
			if (isCreateMode) {
				setCustomTheme(NEW_THEME_DEFAULTS)
				setName('')
				setIsSavingAsNewTheme(true)
				return
			}
			const currentTheme = resolveTheme(themes, selectedTheme || '', colorScheme)
			const currentName = resolveThemeName(themes, selectedTheme || '', colorScheme)
			setCustomTheme(currentTheme)
			setName(currentName)
			setIsSavingAsNewTheme(DEFAULT_THEMES.includes(currentName))
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[selectedTheme, mode],
	)

	const onChangeColor = useCallback(
		(value: string) => {
			setCustomTheme((theme) => ({
				...theme,
				colors: {
					background: theme.colors?.background ?? '#000000',
					foreground: theme.colors?.foreground ?? '#ffffff',
					[editingColor]: value,
				},
			}))
		},
		[editingColor],
	)

	const handleCancel = useCallback(() => {
		onCancel()
		setCustomTheme(resolveTheme(themes, selectedTheme || '', colorScheme))
	}, [onCancel, themes, selectedTheme, colorScheme])

	const handleSave = useCallback(() => {
		const trimmedName = name.trim()

		if (!trimmedName) {
			Alert.alert('Error', 'Please enter a theme name')
			return
		}

		if (!customTheme.colors?.background || !customTheme.colors?.foreground) {
			Alert.alert('Error', 'Theme colors are required')
			return
		}

		const currentName = resolveThemeName(themes, selectedTheme || '', colorScheme)

		if (isSavingAsNewTheme) {
			if (themes[trimmedName] && trimmedName !== currentName) {
				Alert.alert('Error', 'A theme with this name already exists')
				return
			}
			addTheme(trimmedName, customTheme)
			selectTheme(trimmedName)
		} else {
			addTheme(currentName, customTheme)
		}

		onCancel()
	}, [
		name,
		customTheme,
		themes,
		selectedTheme,
		colorScheme,
		isSavingAsNewTheme,
		addTheme,
		selectTheme,
		onCancel,
	])

	const handleDelete = useCallback(() => {
		const currentName = resolveThemeName(themes, selectedTheme || '', colorScheme)

		if (DEFAULT_THEMES.includes(currentName)) {
			Alert.alert('Error', 'Cannot delete default themes')
			return
		}

		Alert.alert('Delete Theme', `Are you sure you want to delete "${currentName}"?`, [
			{ text: 'Cancel', style: 'cancel' },
			{
				text: 'Delete',
				style: 'destructive',
				onPress: () => {
					deleteTheme(currentName)
					selectTheme(colorScheme === 'dark' ? 'Dark' : 'Light')
					onCancel()
				},
			},
		])
	}, [themes, selectedTheme, colorScheme, deleteTheme, selectTheme, onCancel])

	return (
		<Fragment>
			<ThemeHeaderPreview customTheme={customTheme} onCancel={handleCancel} onSaved={handleSave} />

			<ScrollView
				contentContainerStyle={{
					paddingHorizontal: 16,
					paddingBottom: insets.bottom + 16,
					gap: 16,
				}}
			>
				<View className="gap-4">
					<View className="flex-row items-center gap-4">
						{!isDefaultTheme && !isCreateMode && (
							<View className="flex-row items-center gap-2">
								<Checkbox
									checked={isSavingAsNewTheme}
									onCheckedChange={(checked) => setIsSavingAsNewTheme(!!checked)}
								/>
								<Label>Save as new</Label>
							</View>
						)}

						<View className="flex-1">
							<Input
								value={name}
								onChangeText={setName}
								placeholder="Theme name"
								editable={isSavingAsNewTheme || !isDefaultTheme}
							/>
						</View>
					</View>

					{!isDefaultTheme && (
						<View className="flex-row justify-end">
							<Text className="text-destructive" onPress={handleDelete}>
								Delete Theme
							</Text>
						</View>
					)}
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
					value={customTheme.colors?.[editingColor] ?? '#FFFFFF'}
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

				<View className="flex-row gap-4">
					<View className="flex-1 items-center gap-2">
						<Text className="text-sm text-foreground-muted">Background</Text>
						<View
							className="h-12 w-full rounded-lg border border-edge"
							style={{ backgroundColor: customTheme.colors?.background }}
						/>
					</View>
					<View className="flex-1 items-center gap-2">
						<Text className="text-sm text-foreground-muted">Text</Text>
						<View
							className="h-12 w-full rounded-lg border border-edge"
							style={{ backgroundColor: customTheme.colors?.foreground }}
						/>
					</View>
				</View>
			</ScrollView>
		</Fragment>
	)
}
