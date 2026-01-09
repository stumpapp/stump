import { Fragment, useCallback, useEffect, useState } from 'react'
import { Alert, ScrollView } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { Input } from '~/components/ui'
import { useColorScheme } from '~/lib/useColorScheme'
import { resolveTheme, resolveThemeName, StoredConfig, useEpubThemesStore } from '~/stores/epub'

import { ColorPickerRow } from './colorPickerRow/ColorPickerRow'
import { ThemeHeaderPreview } from './ThemeHeaderPreview'

type Props = {
	onCancel: () => void
	mode?: 'edit' | 'create'
	theme?: string
}

const DEFAULT_THEMES = ['Light', 'Dark', 'Sepia']

const NEW_THEME_DEFAULTS: StoredConfig = {
	colors: {
		background: '#FFFFFF',
		foreground: '#000000',
	},
}

export default function CustomizeTheme({ onCancel, mode = 'edit', theme: namedTheme }: Props) {
	const { colorScheme } = useColorScheme()
	const insets = useSafeAreaInsets()

	const { themes, selectedTheme, addTheme, selectTheme } = useEpubThemesStore((store) => ({
		themes: store.themes,
		selectedTheme: store.selectedTheme,
		addTheme: store.addTheme,
		selectTheme: store.selectTheme,
	}))

	const isCreateMode = mode === 'create'
	const themeToEdit = namedTheme || selectedTheme || ''

	const [customTheme, setCustomTheme] = useState<StoredConfig>(() =>
		isCreateMode ? NEW_THEME_DEFAULTS : resolveTheme(themes, themeToEdit, colorScheme),
	)

	const [name, setName] = useState(() =>
		isCreateMode ? '' : resolveThemeName(themes, themeToEdit, colorScheme),
	)

	const isDefaultTheme =
		!isCreateMode && DEFAULT_THEMES.includes(resolveThemeName(themes, themeToEdit, colorScheme))

	useEffect(
		() => {
			if (isCreateMode) {
				setCustomTheme(NEW_THEME_DEFAULTS)
				setName('')
				return
			}
			const currentTheme = resolveTheme(themes, themeToEdit, colorScheme)
			const currentName = resolveThemeName(themes, themeToEdit, colorScheme)
			setCustomTheme(currentTheme)
			setName(currentName)
		},
		// eslint-disable-next-line react-compiler/react-compiler
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[themeToEdit, mode],
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
		setCustomTheme(resolveTheme(themes, themeToEdit, colorScheme))
	}, [onCancel, themes, themeToEdit, colorScheme])

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

		const currentName = resolveThemeName(themes, themeToEdit, colorScheme)

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
		themeToEdit,
		colorScheme,
		isCreateMode,
		addTheme,
		selectTheme,
		onCancel,
	])

	return (
		<Fragment>
			<ThemeHeaderPreview customTheme={customTheme} onCancel={handleCancel} onSaved={handleSave} />

			<ScrollView
				contentContainerStyle={{
					paddingHorizontal: 16,
					paddingTop: 16,
					paddingBottom: insets.bottom + 16,
					gap: 16,
				}}
			>
				<Input
					value={name}
					onChangeText={setName}
					placeholder="Theme name"
					editable={isCreateMode || !isDefaultTheme}
				/>

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
