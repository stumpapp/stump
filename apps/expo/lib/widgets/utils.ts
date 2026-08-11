import { Asset } from 'expo-asset'
import { File } from 'expo-file-system'
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator'
import { useEffect, useMemo } from 'react'
import { Platform } from 'react-native'

import { useOwlAssets } from '~/components/Owl'

import { widgetAssetsDirectory } from '../filesystem'

// this is VERY important, because the widget will crash if the image is too large to render. ask me
// how i know :(
export async function createThumbnail(sourceUri: string): Promise<File> {
	const manipulator = ImageManipulator.manipulate(sourceUri).resize({ width: 300 }) // height will scale
	const renderedImage = await manipulator.renderAsync()
	const resized = await renderedImage.saveAsync({
		format: SaveFormat.PNG,
		compress: 0.85,
	})
	return new File(resized.uri)
}

// this is terrible dx, i hope expo improves this in the future. this just copies
// the assets into the widget's container so that the widget can access them
async function ensureWidgetAssetsWritten(assets: Asset[]) {
	if (!widgetAssetsDirectory.exists) {
		widgetAssetsDirectory.create({ intermediates: true })
	}

	for (const { uri, name } of assets) {
		try {
			const dest = new File(widgetAssetsDirectory, `${name}.png`)
			if (dest.exists) continue
			const tmp = await File.downloadFileAsync(uri, widgetAssetsDirectory, { idempotent: true })
			const resized = await createThumbnail(tmp.uri)
			await resized.move(dest)
		} catch (error) {
			console.error(`Failed to write widget asset ${name}`, error)
		}
	}
}

export function useEnsureWidgetAssetsWritten() {
	const { getOwlVariants, assets } = useOwlAssets()

	const assetsToTransfer = useMemo(() => {
		if (!assets) return []
		const emptyVariants = getOwlVariants('empty')
		return Object.values(emptyVariants).filter((asset) => asset != null)
	}, [getOwlVariants, assets])

	useEffect(() => {
		// TODO(widgets): eventually when expo-widgets supports android, we can remove this check
		if (Platform.OS === 'android') return
		if (!assetsToTransfer.length) return
		ensureWidgetAssetsWritten(assetsToTransfer)
	}, [assetsToTransfer])
}
