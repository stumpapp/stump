import { Api } from '@stump/sdk'

export function prefetchMediaPage(sdk: Api, mediaId: string, page: number): HTMLImageElement {
	const img = new Image()
	img.src = sdk.media.bookPageURL(mediaId, page)
	return img
}
