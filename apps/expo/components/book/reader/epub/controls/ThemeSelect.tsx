import { Plus } from 'lucide-react-native'
import { useCallback, useMemo } from 'react'
import { Alert, Pressable, ScrollView, View } from 'react-native'
import * as ContextMenu from 'zeego/context-menu'

import { Icon } from '~/components/ui/icon'
import { IS_IOS_24_PLUS } from '~/lib/constants'
import { useColorScheme } from '~/lib/useColorScheme'
import { cn } from '~/lib/utils'
import { EPUBReaderThemeConfig } from '~/modules/readium'
import { resolveThemeName, useEpubThemesStore } from '~/stores/epub'
import { useEpubSheetStore } from '~/stores/epubSheet'

import { ThemePreview } from './customTheme/ThemePreview'

export default function ThemeSelect() {
	const { colorScheme } = useColorScheme()
	const { themes, selectedTheme } = useEpubThemesStore((store) => ({
		themes: store.themes,
		selectedTheme: store.selectedTheme,
	}))

	const activeTheme = useMemo(
		() => resolveThemeName(themes, selectedTheme || '', colorScheme),
		[themes, selectedTheme, colorScheme],
	)

	return (
		<ScrollView
			horizontal
			showsHorizontalScrollIndicator={false}
			// The sheet has p-6 (21px), so we remove 1px to look like the scroll is going under the ios 26+ sheet border
			className={cn('-mx-6 -my-16', IS_IOS_24_PLUS && '-mx-[20px]')}
			// Context menu (long press) has a massive shadow on ios so we need a lot of padding to not have it be cut off
			contentContainerClassName="px-8 py-16 gap-2"
		>
			{Object.entries(themes).map(([name, config]) => (
				<View key={name} className="items-center">
					<ThemePreviewButton
						name={name}
						config={config}
						isActive={activeTheme === name}
						themeNames={Object.keys(themes)}
					/>
				</View>
			))}

			<NewThemeButton />
		</ScrollView>
	)
}

type ThemePreviewButtonProps = {
	name: string
	config: EPUBReaderThemeConfig
	isActive?: boolean
	themeNames: string[]
}

const ThemePreviewButton = ({ name, config, isActive, themeNames }: ThemePreviewButtonProps) => {
	const { onSelect, deleteTheme, addTheme } = useEpubThemesStore((store) => ({
		onSelect: store.selectTheme,
		deleteTheme: store.deleteTheme,
		addTheme: store.addTheme,
	}))
	const openCustomizeTheme = useEpubSheetStore((state) => state.openCustomizeTheme)

	const handleDuplicate = useCallback(() => {
		const newName = `${name} copy`
		addTheme(newName, config)
		onSelect(newName)
	}, [name, config, addTheme, onSelect])

	const handleDelete = useCallback(() => {
		if (themeNames.length <= 1) {
			Alert.alert('Error', 'You must have at least one theme')
			return
		}

		Alert.alert('Delete Theme', `Are you sure you want to delete "${name}"?`, [
			{ text: 'Cancel', style: 'cancel' },
			{
				text: 'Delete',
				style: 'destructive',
				onPress: () => {
					if (isActive) {
						const currentIndex = themeNames.indexOf(name)
						const nextTheme =
							themeNames[currentIndex + 1] ?? themeNames[currentIndex - 1] ?? themeNames[0]
						// Note: This shouldn't really happen
						if (nextTheme) {
							onSelect(nextTheme)
						}
					}
					deleteTheme(name)
				},
			},
		])
	}, [themeNames, name, deleteTheme, isActive, onSelect])

	return (
		<ContextMenu.Root>
			<ContextMenu.Trigger>
				<Pressable onPress={() => onSelect(name)} onLongPress={() => {}} delayLongPress={400}>
					<ThemePreview
						name={name}
						theme={config}
						className={cn(isActive && 'border-2 border-edge-brand dark:border-edge-brand')}
					/>
				</Pressable>
			</ContextMenu.Trigger>

			<ContextMenu.Content>
				<ContextMenu.Item key="edit" onSelect={() => openCustomizeTheme({ mode: 'edit', name })}>
					<ContextMenu.ItemIcon ios={{ name: 'pencil' }} androidIconName="ic_menu_edit" />
					<ContextMenu.ItemTitle>Edit Theme</ContextMenu.ItemTitle>
				</ContextMenu.Item>

				<ContextMenu.Item key="duplicate" onSelect={handleDuplicate}>
					<ContextMenu.ItemIcon
						ios={{ name: 'plus.square.on.square' }}
						androidIconName="ic_menu_add"
					/>
					<ContextMenu.ItemTitle>Duplicate</ContextMenu.ItemTitle>
				</ContextMenu.Item>

				<ContextMenu.Item key="delete" onSelect={handleDelete} destructive>
					<ContextMenu.ItemIcon ios={{ name: 'trash' }} androidIconName="ic_menu_delete" />
					<ContextMenu.ItemTitle>Delete</ContextMenu.ItemTitle>
				</ContextMenu.Item>
			</ContextMenu.Content>
		</ContextMenu.Root>
	)
}

const NewThemeButton = () => {
	const openCustomizeTheme = useEpubSheetStore((state) => state.openCustomizeTheme)
	return (
		<Pressable onPress={() => openCustomizeTheme({ mode: 'create' })}>
			<View className="squircle aspect-[6/5] w-24 items-center justify-center rounded-3xl border-2 border-dashed border-black/60 dark:border-white/60">
				<Icon as={Plus} size={24} className="text-black/60 dark:text-white/60" />
			</View>
		</Pressable>
	)
}
