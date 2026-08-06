import { Plus } from 'lucide-react-native'
import { useCallback, useMemo } from 'react'
import { Alert, Pressable, ScrollView, View } from 'react-native'
import * as ContextMenu from 'zeego/context-menu'
import { useShallow } from 'zustand/react/shallow'

import { Icon } from '~/components/ui/icon'
import { useTranslate } from '~/lib/hooks'
import { IS_IOS_26_PLUS } from '~/lib/constants'
import { useColorScheme } from '~/lib/useColorScheme'
import { cn } from '~/lib/utils'
import { EPUBReaderThemeConfig } from '~/modules/readium'
import { resolveThemeName, useEpubThemesStore } from '~/stores/epub'
import { useEpubSheetStore } from '~/stores/epubSheet'

import { ThemePreview } from './customTheme/ThemePreview'

export default function ThemeSelect() {
	const { colorScheme } = useColorScheme()
	const { themes, selectedTheme } = useEpubThemesStore(
		useShallow((store) => ({
			themes: store.themes,
			selectedTheme: store.selectedTheme,
		})),
	)

	const activeTheme = useMemo(
		() => resolveThemeName(themes, selectedTheme || '', colorScheme),
		[themes, selectedTheme, colorScheme],
	)

	return (
		<ScrollView
			horizontal
			showsHorizontalScrollIndicator={false}
			// The sheet has p-6 (21px), so we remove 1px to look like the scroll is going under the ios 26+ sheet border
			className={cn('-mx-6 -my-16', IS_IOS_26_PLUS && '-mx-[20px]')}
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
	const { t } = useTranslate()
	const { onSelect, deleteTheme, addTheme } = useEpubThemesStore(
		useShallow((store) => ({
			onSelect: store.selectTheme,
			deleteTheme: store.deleteTheme,
			addTheme: store.addTheme,
		})),
	)
	const openCustomizeTheme = useEpubSheetStore((state) => state.openCustomizeTheme)

	const handleDuplicate = useCallback(() => {
		const newName = t('reader.themeCopyName', { name })
		addTheme(newName, config)
		onSelect(newName)
	}, [name, config, addTheme, onSelect, t])

	const handleDelete = useCallback(() => {
		if (themeNames.length <= 1) {
			Alert.alert(t('common.error'), t('reader.minimumThemeError'))
			return
		}

		Alert.alert(t('reader.deleteTheme'), t('reader.deleteThemeConfirmation', { name }), [
			{ text: t('common.cancel'), style: 'cancel' },
			{
				text: t('common.delete'),
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
	}, [themeNames, name, deleteTheme, isActive, onSelect, t])

	return (
		<ContextMenu.Root>
			<ContextMenu.Trigger>
				<Pressable onPress={() => onSelect(name)} onLongPress={() => {}} delayLongPress={400}>
					<ThemePreview
						name={name}
						theme={config}
						className={cn(isActive && 'border-edge-brand dark:border-edge-brand border-2')}
					/>
				</Pressable>
			</ContextMenu.Trigger>

			<ContextMenu.Content>
				<ContextMenu.Item key="edit" onSelect={() => openCustomizeTheme({ mode: 'edit', name })}>
					<ContextMenu.ItemIcon ios={{ name: 'pencil' }} androidIconName="ic_menu_edit" />
					<ContextMenu.ItemTitle>{t('reader.editTheme')}</ContextMenu.ItemTitle>
				</ContextMenu.Item>

				<ContextMenu.Item key="duplicate" onSelect={handleDuplicate}>
					<ContextMenu.ItemIcon
						ios={{ name: 'plus.square.on.square' }}
						androidIconName="ic_menu_add"
					/>
					<ContextMenu.ItemTitle>{t('reader.duplicateTheme')}</ContextMenu.ItemTitle>
				</ContextMenu.Item>

				<ContextMenu.Item key="delete" onSelect={handleDelete} destructive>
					<ContextMenu.ItemIcon ios={{ name: 'trash' }} androidIconName="ic_menu_delete" />
					<ContextMenu.ItemTitle>{t('common.delete')}</ContextMenu.ItemTitle>
				</ContextMenu.Item>
			</ContextMenu.Content>
		</ContextMenu.Root>
	)
}

const NewThemeButton = () => {
	const openCustomizeTheme = useEpubSheetStore((state) => state.openCustomizeTheme)
	return (
		<Pressable onPress={() => openCustomizeTheme({ mode: 'create' })}>
			<View className="squircle w-24 border-black/60 dark:border-white/60 aspect-[6/5] items-center justify-center rounded-3xl border-2 border-dashed">
				<Icon as={Plus} size={24} className="text-black/60 dark:text-white/60" />
			</View>
		</Pressable>
	)
}
