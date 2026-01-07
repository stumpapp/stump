import { Plus } from 'lucide-react-native'
import { useMemo } from 'react'
import { Pressable, ScrollView, View } from 'react-native'
import * as ContextMenu from 'zeego/context-menu'

import { Text } from '~/components/ui'
import { Icon } from '~/components/ui/icon'
import { IS_IOS_24_PLUS } from '~/lib/constants'
import { useColorScheme } from '~/lib/useColorScheme'
import { cn } from '~/lib/utils'
import { EPUBReaderThemeConfig } from '~/modules/readium'
import { resolveThemeName, useEpubThemesStore } from '~/stores/epub'
import { useEpubSheetStore } from '~/stores/epubSheet'

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

	// TODO: Grid
	return (
		<ScrollView
			horizontal
			showsHorizontalScrollIndicator={false}
			// The sheet has p-6 (21px), so we remove 1px to look like the scroll is going under the ios 26+ sheet border
			className={cn('-mx-6 -my-16', IS_IOS_24_PLUS && '-mx-[20px]')}
			// Context menu (long press) has a massive shadow on ios so we need a lot of padding to not have it be cut off
			contentContainerClassName="px-8 py-16 gap-3"
		>
			{Object.entries(themes).map(([name, config]) => (
				<View key={name} className="items-center">
					<ThemePreview name={name} config={config} isActive={activeTheme === name} />
				</View>
			))}

			<NewThemeButton />
		</ScrollView>
	)
}

type ThemePreviewProps = {
	name: string
	config: EPUBReaderThemeConfig
	isActive?: boolean
}

// TODO: Take in border?
const ThemePreview = ({ name, config, isActive }: ThemePreviewProps) => {
	const onSelect = useEpubThemesStore((store) => store.selectTheme)
	const openCustomizeTheme = useEpubSheetStore((state) => state.openCustomizeTheme)

	return (
		<ContextMenu.Root>
			<ContextMenu.Trigger>
				<Pressable onPress={() => onSelect(name)} onLongPress={() => {}} delayLongPress={400}>
					<View
						className={cn(
							'squircle h-20 w-24 items-center justify-center rounded-3xl border-2 border-transparent shadow',
							{ 'border-edge-brand': isActive },
						)}
						style={{ backgroundColor: config.colors?.background }}
					>
						<Text
							style={{ color: config.colors?.foreground }}
							className="items-center justify-center text-2xl"
						>
							Aa
						</Text>
						<Text className="text-center text-base" style={{ color: config.colors?.foreground }}>
							{name}
						</Text>
					</View>
				</Pressable>
			</ContextMenu.Trigger>

			<ContextMenu.Content>
				<ContextMenu.Item key="edit" onSelect={() => openCustomizeTheme({ mode: 'edit', name })}>
					<ContextMenu.ItemIcon ios={{ name: 'pencil' }} androidIconName="ic_menu_edit" />
					<ContextMenu.ItemTitle>Edit Theme</ContextMenu.ItemTitle>
				</ContextMenu.Item>

				{/* TODO: Add duplicate and delete? */}
				{/* <ContextMenu.Item key="duplicate">
					<ContextMenu.ItemIcon
						ios={{ name: 'plus.square.fill.on.square.fill' }}
						androidIconName="ic_menu_add"
					/>
					<ContextMenu.ItemTitle>Duplicate</ContextMenu.ItemTitle>
				</ContextMenu.Item>

				<ContextMenu.Item key="delete" destructive>
					<ContextMenu.ItemIcon ios={{ name: 'trash' }} androidIconName="ic_menu_delete" />
					<ContextMenu.ItemTitle>Delete</ContextMenu.ItemTitle>
				</ContextMenu.Item> */}
			</ContextMenu.Content>
		</ContextMenu.Root>
	)
}

const NewThemeButton = () => {
	const openCustomizeTheme = useEpubSheetStore((state) => state.openCustomizeTheme)
	return (
		<Pressable onPress={() => openCustomizeTheme({ mode: 'create' })}>
			<View className="squircle h-20 w-24 items-center justify-center rounded-3xl border-2 border-dashed border-black/60 dark:border-white/60">
				<Icon as={Plus} size={24} className="text-black/60 dark:text-white/60" />
			</View>
		</Pressable>
	)
}
