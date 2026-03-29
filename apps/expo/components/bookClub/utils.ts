import { match, P } from 'ts-pattern'

type BookClubBookData =
	| {
			imageUrl?: string | null
	  }
	| {
			entity?: {
				__typename: 'Media'
				thumbnail: {
					url: string
					metadata: {
						averageColor: string
						colors: {
							color: string
							percentage: number
						}[]
						thumbhash: string
					}
					height?: number
					width?: number
				}
			}
	  }

type GetClubBookThumbnailDataParams = {
	getHeaders: () => Record<string, string>
}

export function getClubBookThumbnailData(
	data: BookClubBookData | undefined | null,
	params?: GetClubBookThumbnailDataParams,
) {
	const imageProps = match(data)
		.with({ entity: { __typename: 'Media' } }, ({ entity: media }) => ({
			url: media.thumbnail.url,
			placeholderData: media.thumbnail.metadata,
			originalDimensions:
				media.thumbnail.width && media.thumbnail.height
					? { width: media.thumbnail.width, height: media.thumbnail.height }
					: undefined,
			headers: params?.getHeaders(),
		}))
		.with({ imageUrl: P.string }, ({ imageUrl }) => ({
			url: imageUrl!,
			headers: undefined,
			placeholderData: undefined,
			originalDimensions: undefined,
		}))
		.otherwise(() => null)
	return imageProps
}
