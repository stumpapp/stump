import { useSDK } from '@stump/client'
import { Library } from '@stump/sdk'

import { useActiveServer } from '../activeServer'
import GridImageItem from '../grid/GridImageItem'

type Props = {
	library: Library
	index: number
}

export default function LibraryGridItem({ library, index }: Props) {
	const {
		activeServer: { id: serverID },
	} = useActiveServer()
	const { sdk } = useSDK()

	return (
		<GridImageItem
			uri={sdk.library.thumbnailURL(library.id)}
			title={library.name}
			href={`/server/${serverID}/libraries/${library.id}`}
			index={index}
		/>
	)
}
