import { ReadingDirection } from '@stump/graphql'
import { useCallback, useEffect, useState } from 'react'
import { Pressable, TextStyle, View } from 'react-native'

import { Text } from '~/components/ui'
import { IS_IOS_24_PLUS } from '~/lib/constants'
import { useColorScheme } from '~/lib/useColorScheme'
import { useReaderStore } from '~/stores'
import {
	getFontPath,
	resolveTheme,
	StoredConfig,
	SupportedMobileFont,
	useEpubThemesStore,
} from '~/stores/epub'

const HEIGHT = 228

type Props = {
	customTheme?: StoredConfig
	onCancel?: () => void
	onSaved?: () => void
}

export const ThemeHeaderPreview = ({ customTheme: customThemeProp, onCancel, onSaved }: Props) => {
	const { colorScheme } = useColorScheme()
	const { themes, selectedTheme } = useEpubThemesStore((store) => ({
		themes: store.themes,
		selectedTheme: store.selectedTheme,
	}))
	// Note: A majority of style options which apply if publisher styles are false are not easily
	// represented here in the preview, so they are excluded
	const { fontSize, fontFamily, fontWeight, allowPublisherStyles, ...storedPreferences } =
		useReaderStore((state) => ({
			fontSize: state.globalSettings.fontSize,
			fontFamily: state.globalSettings.fontFamily,
			fontWeight: state.globalSettings.fontWeight,
			lineHeight: state.globalSettings.lineHeight,
			textAlign: state.globalSettings.textAlign,
			letterSpacing: state.globalSettings.letterSpacing,
			typeScale: state.globalSettings.typeScale,
			allowPublisherStyles: state.globalSettings.allowPublisherStyles,
			readingDirection: state.globalSettings.readingDirection,
		}))

	const typeScale = allowPublisherStyles ? 1.0 : (storedPreferences.typeScale ?? 1.0)
	const lineHeight = allowPublisherStyles ? 1.5 : (storedPreferences.lineHeight ?? 1.5)
	const letterSpacing = allowPublisherStyles ? undefined : storedPreferences.letterSpacing

	const isRTL = storedPreferences.readingDirection === ReadingDirection.Rtl
	const textAlign = allowPublisherStyles
		? isRTL
			? 'right'
			: undefined
		: (storedPreferences.textAlign ?? (isRTL ? 'right' : undefined))

	const [localTheme, setLocalTheme] = useState(() =>
		resolveTheme(themes, selectedTheme || '', colorScheme),
	)

	useEffect(() => {
		setLocalTheme(resolveTheme(themes, selectedTheme || '', colorScheme))
	}, [selectedTheme, themes, colorScheme])

	const displayTheme = customThemeProp ?? localTheme

	const handleCancel = useCallback(() => {
		if (onCancel) {
			onCancel()
			setLocalTheme(resolveTheme(themes, selectedTheme || '', colorScheme))
		}
	}, [onCancel, themes, selectedTheme, colorScheme])

	return (
		<View
			style={{
				height: HEIGHT,
				backgroundColor: displayTheme.colors?.background,
				paddingTop: IS_IOS_24_PLUS ? 16 : 0,
			}}
		>
			{onCancel && onSaved && (
				<View className="h-12 flex-row items-center justify-between px-4">
					<Pressable onPress={handleCancel}>
						{({ pressed }) => (
							<Text
								className="text-lg"
								style={{ color: displayTheme.colors?.foreground, opacity: pressed ? 0.6 : 1 }}
							>
								Cancel
							</Text>
						)}
					</Pressable>

					<Pressable onPress={onSaved}>
						{({ pressed }) => (
							<Text
								className="text-lg font-medium"
								style={{ color: displayTheme.colors?.foreground, opacity: pressed ? 0.6 : 1 }}
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
						color: displayTheme.colors?.foreground,
						fontSize: fontSize ? (fontSize + 6) * typeScale : 32,
						lineHeight: fontSize ? (fontSize + 6) * typeScale * lineHeight : 32,
						fontFamily: fontFamily ? getFontPath(fontFamily as SupportedMobileFont) : undefined,
						fontWeight: fontWeight as TextStyle['fontWeight'],
						letterSpacing: letterSpacing ? letterSpacing * (fontSize ?? 16) : undefined,
						textAlign: isRTL ? 'right' : 'left',
					}}
				>
					Aa
				</Text>

				<Text
					style={{
						color: displayTheme.colors?.foreground,
						fontSize: fontSize ? fontSize * typeScale : undefined,
						lineHeight: fontSize ? fontSize * typeScale * lineHeight : 32,
						fontFamily: fontFamily ? getFontPath(fontFamily as SupportedMobileFont) : undefined,
						fontWeight: fontWeight as TextStyle['fontWeight'],
						letterSpacing: letterSpacing ? letterSpacing * (fontSize ?? 16) : undefined,
						textAlign: textAlign === 'start' ? 'left' : textAlign,
					}}
					numberOfLines={
						fontSize
							? getNumberOfLines(fontSize * typeScale, lineHeight, !!onCancel && !!onSaved)
							: 3
					}
				>
					{DEMO_TEXT}
				</Text>
			</View>
		</View>
	)
}

const getNumberOfLines = (fontSize: number, lineHeight: number, hasHeader: boolean) => {
	const sizePlusPadding =
		(IS_IOS_24_PLUS ? HEIGHT + 16 : HEIGHT) -
		48 - // 48 for header
		32 - // Secondary padding
		(hasHeader ? 48 / 2 : 0) -
		(fontSize + 6) * lineHeight // Size of Aa text

	const approxLineHeight = fontSize * lineHeight
	return Math.floor(sizePlusPadding / approxLineHeight)
}

const DEMO_TEXT = `Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Lorem ipsum dolor sit amet consectetur adipiscing elit. Quisque faucibus ex sapien vitae pellentesque sem placerat. In id cursus mi pretium tellus duis convallis. Tempus leo eu aenean sed diam urna tempor. Pulvinar vivamus fringilla lacus nec metus bibendum egestas. Iaculis massa nisl malesuada lacinia integer nunc posuere. Ut hendrerit semper vel class aptent taciti sociosqu. Ad litora torquent per conubia nostra inceptos himenaeos.`
