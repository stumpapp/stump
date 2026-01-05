import { Fragment, useCallback, useEffect, useState } from 'react'
import { Alert, ScrollView, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { Input, Text } from '~/components/ui'
import { useColorScheme } from '~/lib/useColorScheme'
import { resolveTheme, resolveThemeName, StoredConfig, useEpubThemesStore } from '~/stores/epub'

import { ColorPickerRow } from './colorPickerRow/ColorPickerRow'
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
				return
			}
			const currentTheme = resolveTheme(themes, selectedTheme || '', colorScheme)
			const currentName = resolveThemeName(themes, selectedTheme || '', colorScheme)
			setCustomTheme(currentTheme)
			setName(currentName)
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[selectedTheme, mode],
	)

	const onChangeBackground = useCallback((value: string) => {
		setCustomTheme((theme) => ({
			...theme,
			colors: {
				background: value,
				foreground: theme.colors?.foreground ?? '#000000',
			},
		}))
	}, [])

	const onChangeForeground = useCallback((value: string) => {
		setCustomTheme((theme) => ({
			...theme,
			colors: {
				background: theme.colors?.background ?? '#FFFFFF',
				foreground: value,
			},
		}))
	}, [])

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

		if (isCreateMode) {
			if (themes[trimmedName]) {
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
		isCreateMode,
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
				<View className="gap-2">
					<Input
						value={name}
						onChangeText={setName}
						placeholder="Theme name"
						editable={isCreateMode || !isDefaultTheme}
					/>

					{!isDefaultTheme && !isCreateMode && (
						<View className="flex-row justify-end">
							<Text className="text-destructive" onPress={handleDelete}>
								Delete Theme
							</Text>
						</View>
					)}
				</View>

				<ColorPickerRow
					label="Background"
					value={customTheme.colors?.background ?? '#FFFFFF'}
					onChange={onChangeBackground}
				/>

				<ColorPickerRow
					label="Text"
					value={customTheme.colors?.foreground ?? '#000000'}
					onChange={onChangeForeground}
				/>
			</ScrollView>
		</Fragment>
	)
}
