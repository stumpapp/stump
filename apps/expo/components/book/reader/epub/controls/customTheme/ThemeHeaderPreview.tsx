import { useCallback, useEffect, useState } from 'react'
import { Pressable, View } from 'react-native'

import { Text } from '~/components/ui'
import { IS_IOS_24_PLUS } from '~/lib/constants'
import { useColorScheme } from '~/lib/useColorScheme'
import { useReaderStore } from '~/stores'
import { getFontPath, resolveTheme, SupportedMobileFont, useEpubThemesStore } from '~/stores/epub'

const HEIGHT = 228

type Props = {
	onCancel?: () => void
	onSaved?: () => void
}

export const ThemeHeaderPreview = ({ onCancel, onSaved }: Props) => {
	const { colorScheme } = useColorScheme()
	const { themes, selectedTheme } = useEpubThemesStore((store) => ({
		themes: store.themes,
		selectedTheme: store.selectedTheme,
	}))
	const { fontSize, fontFamily } = useReaderStore((state) => ({
		fontSize: state.globalSettings.fontSize,
		fontFamily: state.globalSettings.fontFamily,
	}))

	const [customTheme, setCustomTheme] = useState(() =>
		resolveTheme(themes, selectedTheme || '', colorScheme),
	)

	useEffect(
		() => {
			setCustomTheme(resolveTheme(themes, selectedTheme || '', colorScheme))
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[selectedTheme],
	)

	const handleCancel = useCallback(() => {
		if (onCancel) {
			onCancel?.()
			setCustomTheme(resolveTheme(themes, selectedTheme || '', colorScheme))
		}
	}, [onCancel, themes, selectedTheme, colorScheme])

	return (
		<View
			style={{
				height: HEIGHT,
				backgroundColor: customTheme.colors?.background,
				paddingTop: IS_IOS_24_PLUS ? 16 : 0,
			}}
		>
			{onCancel && onSaved && (
				<View className="h-12 flex-row items-center justify-between px-4">
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
			)}

			<View className="gap-2 px-6 py-4">
				<Text
					style={{
						color: customTheme.colors?.foreground,
						fontSize: fontSize ? fontSize + 6 : 32,
						lineHeight: fontSize ? (fontSize + 6) * 1.5 : 32,
						fontFamily: fontFamily ? getFontPath(fontFamily as SupportedMobileFont) : undefined,
					}}
				>
					Aa
				</Text>

				<Text
					style={{
						color: customTheme.colors?.foreground,
						fontSize,
						lineHeight: fontSize ? fontSize * 1.5 : 32,
						fontFamily: fontFamily ? getFontPath(fontFamily as SupportedMobileFont) : undefined,
					}}
					numberOfLines={fontSize ? getNumberOfLines(fontSize, !!onCancel && !!onSaved) : 3}
				>
					{DEMO_TEXT}
				</Text>
			</View>
		</View>
	)
}

const getNumberOfLines = (fontSize: number, hasHeader: boolean) => {
	const sizePlusPadding =
		(IS_IOS_24_PLUS ? HEIGHT + 16 : HEIGHT) -
		48 - // 48 for header
		32 - // Secondary padding
		(hasHeader ? 48 / 2 : 0) -
		(fontSize + 6) * 1.5 // Size of Aa text

	const approxLineHeight = fontSize * 1.5
	return Math.floor(sizePlusPadding / approxLineHeight)
}

const DEMO_TEXT = `Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Lorem ipsum dolor sit amet consectetur adipiscing elit. Quisque faucibus ex sapien vitae pellentesque sem placerat. In id cursus mi pretium tellus duis convallis. Tempus leo eu aenean sed diam urna tempor. Pulvinar vivamus fringilla lacus nec metus bibendum egestas. Iaculis massa nisl malesuada lacinia integer nunc posuere. Ut hendrerit semper vel class aptent taciti sociosqu. Ad litora torquent per conubia nostra inceptos himenaeos.`
