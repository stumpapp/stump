import { useSDK } from '@stump/client'
import { Media } from '@stump/sdk'

import { useActiveServer } from '../activeServer'
import GridImageItem from '../GridImageItem'

type Props = {
	book: Media
}

export default function BookGridItem({ book }: Props) {
	const { sdk } = useSDK()
	const {
		activeServer: { id: serverID },
	} = useActiveServer()

	return (
		<GridImageItem
			uri={sdk.media.thumbnailURL(book.id)}
			title={book.metadata?.title || book.name}
			href={`/server/${serverID}/books/${book.id}`}
		/>
	)
}
