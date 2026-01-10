import { Cog } from 'lucide-react-native'
import { useMemo } from 'react'
import { View } from 'react-native'
import { Pressable, ScrollView } from 'react-native-gesture-handler'

import { Button, Text } from '~/components/ui'
import { Icon } from '~/components/ui/icon'
import { useColorScheme } from '~/lib/useColorScheme'
import { cn } from '~/lib/utils'
import { EPUBReaderThemeConfig } from '~/modules/readium'
import { resolveThemeName, useEpubThemesStore } from '~/stores/epub'

type Props = {
	onCustomizePress?: () => void
}

export default function ThemeSelect({ onCustomizePress }: Props) {
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
		<View className="gap-2">
			<ScrollView
				horizontal
				showsHorizontalScrollIndicator={false}
				contentContainerStyle={{
					padding: 16,
					gap: 12,
				}}
			>
				{Object.entries(themes).map(([name, config]) => (
					<View key={name} className="items-center">
						<ThemePreview name={name} config={config} isActive={activeTheme === name} />
					</View>
				))}
			</ScrollView>

			<View className="flex-row justify-center gap-4 px-4">
				<Button size="sm" className="flex-row" onPress={onCustomizePress}>
					<Icon as={Cog} className="mr-2 h-4 w-4" />
					<Text>Customize</Text>
				</Button>
			</View>
		</View>
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

	return (
		<Pressable onPress={() => onSelect(name)}>
			<View
				className={cn(
					'h-32 w-40 items-center justify-center rounded-lg border-2 border-transparent shadow',
					{
						'border-edge-brand': isActive,
					},
				)}
				style={{ backgroundColor: config.colors?.background }}
			>
				<Text
					style={{
						color: config.colors?.foreground,
					}}
					className="items-center justify-center text-2xl"
				>
					Aa
				</Text>
				<Text className="mt-1 text-center text-base" style={{ color: config.colors?.foreground }}>
					{name}
				</Text>
			</View>
		</Pressable>
	)
}
