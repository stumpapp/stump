import { selectMeshColors } from '@stump/client'
import { ImageColor } from '@stump/graphql'
import { MeshGradientView } from 'expo-mesh-gradient'
import { useMemo } from 'react'
import { Image, ImageStyle, StyleProp, StyleSheet, View } from 'react-native'
import { thumbHashToDataURL } from 'thumbhash'

import { useColors } from '~/lib/constants'
import { usePreferencesStore } from '~/stores'

// prettier-ignore
const POINTS = [
	[0.00, 0.00], [0.50, 0.00], [1.00, 0.00],
	[0.00, 0.80], [0.90, 0.30], [1.00, 0.50],
	[0.00, 1.00], [0.50, 1.00], [1.00, 1.00],
]

export type ThumbnailPlaceholderData = {
	averageColor?: string | null
	colors?: ImageColor[] | null
	thumbhash?: string | null
} | null

export type ThumbnailPlaceholderType = 'grayscale' | 'averageColor' | 'colorful' | 'thumbhash'

export function ThumbnailPlaceholder({
	placeholderData,
	placeholderType,
	fadeDuration,
	style,
}: {
	placeholderData?: ThumbnailPlaceholderData
	placeholderType?: ThumbnailPlaceholderType
	fadeDuration?: number
	style?: StyleProp<ImageStyle>
}) {
	const thumbnailPlaceholderPreference = usePreferencesStore((state) => state.thumbnailPlaceholder)
	const { thumbnail } = useColors()

	const thumbnailPlaceholder = placeholderType || thumbnailPlaceholderPreference

	const meshColors = useMemo(() => {
		if (!placeholderData?.colors) {
			return null
		}
		return selectMeshColors(placeholderData?.colors)
	}, [placeholderData?.colors])

	const colorPoints = useMemo(() => {
		if (!meshColors || !meshColors[0] || !meshColors[1] || !meshColors[2]) {
			return null
		}
		// prettier-ignore
		return [
			meshColors[0], meshColors[0], meshColors[0],
			meshColors[1], meshColors[1], meshColors[1],
			meshColors[2], meshColors[2], meshColors[2],
		]
	}, [meshColors])

	const averageColor = useMemo(() => placeholderData?.averageColor, [placeholderData?.averageColor])
	const thumbHash = useMemo(() => placeholderData?.thumbhash, [placeholderData?.thumbhash])
	const grayscaleStyle = useMemo(
		() => [styles.placeholder, { backgroundColor: thumbnail.placeholder }],
		[thumbnail],
	)

	if (thumbnailPlaceholder === 'grayscale') {
		return <View style={[grayscaleStyle, style]} />
	}

	if (thumbnailPlaceholder === 'averageColor') {
		return (
			<View
				style={[
					styles.placeholder,
					{ backgroundColor: averageColor || thumbnail.placeholder },
					style,
				]}
			/>
		)
	}

	if (thumbnailPlaceholder === 'colorful') {
		return colorPoints ? (
			<MeshGradientView
				style={[styles.placeholder, style]}
				columns={3}
				rows={3}
				colors={colorPoints}
				points={POINTS}
			/>
		) : (
			<View style={grayscaleStyle} />
		)
	}

	if (thumbnailPlaceholder === 'thumbhash' && thumbHash) {
		const thumbHashBinary = Uint8Array.from(atob(thumbHash), (c) => c.charCodeAt(0))
		const dataUrl = thumbHashToDataURL(thumbHashBinary)
		return (
			<Image
				source={{ uri: dataUrl }}
				style={[styles.placeholder, style]}
				resizeMode="stretch"
				fadeDuration={fadeDuration ?? 0}
			/>
		)
	}

	return <View style={grayscaleStyle} />
}

const styles = StyleSheet.create({
	placeholder: { position: 'absolute', inset: 0, overflow: 'hidden' },
})
