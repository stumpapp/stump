import { FragmentType, graphql, useFragment } from '@stump/graphql'
import { MeshGradientView } from 'expo-mesh-gradient'
import { useCallback, useMemo } from 'react'
import { Image, StyleSheet, View } from 'react-native'
import { thumbHashToDataURL } from 'thumbhash'

import { useColors } from '~/lib/constants'
import { usePreferencesStore } from '~/stores'

// prettier-ignore
const POINTS = [
	[0.00, 0.00], [0.50, 0.00], [1.00, 0.00],
	[0.00, 0.80], [0.90, 0.30], [1.00, 0.50],
	[0.00, 1.00], [0.50, 1.00], [1.00, 1.00],
]

const fragment = graphql(`
	fragment ThumbnailPlaceholder on ImageRef {
		metadata {
			averageColor
			meshColors
			thumbhash
		}
	}
`)

export type ThumbnailPlaceholderProps = FragmentType<typeof fragment>

export function ThumbnailPlaceholder(props?: ThumbnailPlaceholderProps) {
	const data = useFragment(fragment, props)

	const thumbnailPlaceholder = usePreferencesStore((state) => state.thumbnailPlaceholder)
	const { thumbnail } = useColors()

	const meshColors = useMemo(() => {
		if (!data?.metadata?.meshColors || data?.metadata.meshColors.length < 3) {
			return null
		}
		return data.metadata.meshColors
	}, [data])

	const colorPoints = useMemo(() => {
		if (!meshColors) {
			return null
		}
		// prettier-ignore
		return [
			meshColors[0], meshColors[0], meshColors[0],
			meshColors[1], meshColors[1], meshColors[1],
			meshColors[2], meshColors[2], meshColors[2],
		]
	}, [meshColors])

	const averageColor = useMemo(() => data?.metadata?.averageColor || null, [data])

	const thumbHash = useMemo(() => data?.metadata?.thumbhash || null, [data])

	const GrayScalePlaceholder = useCallback(
		() => <View style={[styles.placeholder, { backgroundColor: thumbnail.placeholder }]} />,
		[thumbnail],
	)

	if (thumbnailPlaceholder === 'grayscale') {
		return <GrayScalePlaceholder />
	}

	if (thumbnailPlaceholder === 'averageColor') {
		return (
			<View
				style={[styles.placeholder, { backgroundColor: averageColor || thumbnail.placeholder }]}
			/>
		)
	}

	if (thumbnailPlaceholder === 'colorful') {
		return colorPoints ? (
			<MeshGradientView
				style={styles.placeholder}
				columns={3}
				rows={3}
				colors={colorPoints}
				points={POINTS}
			/>
		) : (
			<GrayScalePlaceholder />
		)
	}

	if (thumbnailPlaceholder === 'thumbhash' && thumbHash) {
		const thumbHashBinary = Uint8Array.from(atob(thumbHash), (c) => c.charCodeAt(0))
		const dataUrl = thumbHashToDataURL(thumbHashBinary)
		return <Image source={{ uri: dataUrl }} style={styles.placeholder} resizeMode="stretch" />
	}

	return <GrayScalePlaceholder />
}

const styles = StyleSheet.create({
	placeholder: { position: 'absolute', inset: 0, zIndex: 10, overflow: 'hidden' },
})

// TODO(thumb-placeholder): Maybe just don't use a fragement here lol
export const intoPlaceholderFragment = (
	data?: { averageColor?: string; meshColors?: string[]; thumbhash?: string } | null,
) => {
	return {
		' $fragmentRefs': {
			ThumbnailPlaceholderFragment: {
				metadata: data
					? {
							averageColor: data.averageColor,
							meshColors: data.meshColors ?? [],
							thumbhash: data.thumbhash,
						}
					: undefined,
			},
		},
	} satisfies FragmentType<typeof fragment>
}
