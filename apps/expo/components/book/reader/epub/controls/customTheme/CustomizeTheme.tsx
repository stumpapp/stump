import { Fragment, useCallback, useEffect, useState } from 'react'
import { Alert, Pressable, ScrollView, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { Input, Text } from '~/components/ui'
import { useColorScheme } from '~/lib/useColorScheme'
import { cn } from '~/lib/utils'
import { EPUBReaderThemeConfig } from '~/modules/readium'
import { resolveTheme, resolveThemeName, StoredConfig, useEpubThemesStore } from '~/stores/epub'

import { ColorPickerRow } from './colorPickerRow/ColorPickerRow'
import { ThemeHeaderPreview } from './ThemeHeaderPreview'
import { ThemePreview } from './ThemePreview'

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

	const applyPremadeTheme = (theme: PremadeTheme) => {
		setName(theme.name)
		setCustomTheme({ colors: theme.colors })
	}

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

				<View className="h-px bg-black/10 dark:bg-white/10" />

				<Text className="text-xl">Premade themes</Text>
				<View className="flex-row flex-wrap gap-y-2">
					{PREMADE_THEMES.map((theme) => (
						<View className="w-1/4 px-1" key={theme.name}>
							<Pressable onPress={() => applyPremadeTheme(theme)}>
								{({ pressed }) => (
									<ThemePreview
										name={theme.name}
										theme={theme}
										className={cn(pressed && 'opacity-80', 'w-full tablet:aspect-[5/3]')}
									/>
								)}
							</Pressable>
						</View>
					))}
				</View>
			</ScrollView>
		</Fragment>
	)
}

type PremadeTheme = EPUBReaderThemeConfig & { name: string }

const PREMADE_THEMES: PremadeTheme[] = [
	// Cools
	{ colors: { background: '#ffffff', foreground: '#000000' }, name: 'Light' },
	{ colors: { background: '#eeeeee', foreground: '#131111' }, name: 'Paper' },
	{ colors: { background: '#4a4a4c', foreground: '#e5e5e8' }, name: 'Slate' },
	{ colors: { background: '#212122', foreground: '#f5f5f8' }, name: 'Ink' },
	// Neutrals
	{ colors: { background: '#000000', foreground: '#f5f3ef' }, name: 'Dark' },
	{ colors: { background: '#131110', foreground: '#f5f3ef' }, name: 'Smoke' },
	{ colors: { background: '#292724', foreground: '#f5f3ef' }, name: 'Charcoal' },
	{ colors: { background: '#44413c', foreground: '#f5f3ef' }, name: 'Stone' },
	// Naturals
	{ colors: { background: '#f4e8d2', foreground: '#5b4636' }, name: 'Parchment' },
	{ colors: { background: '#e7d3b5', foreground: '#423328' }, name: 'Papyrus' },
	{ colors: { background: '#dabd98', foreground: '#352920' }, name: 'Sepia' },
	{ colors: { background: '#76634a', foreground: '#fff6e8' }, name: 'Leather' },
	// Woods
	{ colors: { background: '#433b2d', foreground: '#e8dbc7' }, name: 'Olive' },
	{ colors: { background: '#4b3b2b', foreground: '#e2d8c8' }, name: 'Cedar' },
	{ colors: { background: '#312923', foreground: '#ebe1d2' }, name: 'Walnut' },
	{ colors: { background: '#382929', foreground: '#f3e9da' }, name: 'Mahogany' },
]
