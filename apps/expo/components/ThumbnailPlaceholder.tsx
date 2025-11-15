import { MeshGradientView } from 'expo-mesh-gradient'
import { Image, StyleSheet, View } from 'react-native'
import { thumbHashToDataURL } from 'thumbhash'

import { useColors } from '~/lib/constants'
import { usePreferencesStore } from '~/stores'

// const ca = '#e7e7e7' // white or black unused
const c1 = '#5eb0ce'
const c2 = '#0462b0'
const c3 = '#e84f3f'

// prettier-ignore
const colors1 = [
	c3, c3, c3,
	c2, c2, c2,
	c1, c1, c1,
]
// prettier-ignore
const points1 = [
	[0.00, 0.00], [0.50, 0.00], [1.00, 0.00],
	[0.00, 0.80], [0.90, 0.30], [1.00, 0.50],
	[0.00, 1.00], [0.50, 1.00], [1.00, 1.00],
]

export function ThumbnailPlaceholder() {
	const thumbnailPlaceholder = usePreferencesStore((state) => state.thumbnailPlaceholder)
	const { thumbnail } = useColors()
	const colors = colors1
	const points = points1

	if (thumbnailPlaceholder === 'grayscale') {
		return <View style={[styles.placeholder, { backgroundColor: thumbnail.placeholder }]} />
	}

	if (thumbnailPlaceholder === 'monochrome') {
		return <View style={[styles.placeholder, { backgroundColor: '#8292a4' }]} />
	}

	if (thumbnailPlaceholder === 'colorful') {
		return (
			<MeshGradientView
				style={styles.placeholder}
				columns={3}
				rows={3}
				colors={colors}
				points={points}
			/>
		)
	}

	if (thumbnailPlaceholder === 'thumbhash') {
		const thumbHashBase64 = 'JNcNLQqHhV+H2Ip4eXZ5eHmJv3b4'
		const thumbHashBinary = Uint8Array.from(atob(thumbHashBase64), (c) => c.charCodeAt(0))
		const dataUrl = thumbHashToDataURL(thumbHashBinary)
		return <Image source={{ uri: dataUrl }} style={styles.placeholder} resizeMode="stretch" />
	}
}

const styles = StyleSheet.create({
	placeholder: { position: 'absolute', inset: 0, zIndex: 10, overflow: 'hidden' },
})
