import { useSDK } from '@stump/client'
import { Media } from '@stump/sdk'

import { useActiveServer } from '../activeServer'
import GridImageItem from '../grid/GridImageItem'

type Props = {
	book: Media
	index: number
}

export default function BookGridItem({ book, index }: Props) {
	const { sdk } = useSDK()
	const {
		activeServer: { id: serverID },
	} = useActiveServer()

	return (
		<GridImageItem
			uri={sdk.media.thumbnailURL(book.id)}
			title={book.metadata?.title || book.name}
			href={`/server/${serverID}/books/${book.id}`}
			index={index}
		/>
	)
}
