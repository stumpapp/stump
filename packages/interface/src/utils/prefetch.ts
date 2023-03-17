import { getMediaPage } from '@stump/api'

export function prefetchMediaPage(mediaId: string, page: number): HTMLImageElement {
	const img = new Image()
	img.src = getMediaPage(mediaId, page)

	return img
}
