import { useSDK } from '@stump/client'
import { Library } from '@stump/sdk'
import * as ContextMenu from 'zeego/context-menu'

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
		<ContextMenu.Root>
			<ContextMenu.Trigger>
				<GridImageItem
					uri={sdk.library.thumbnailURL(library.id)}
					title={library.name}
					href={`/server/${serverID}/libraries/${library.id}`}
					index={index}
				/>
			</ContextMenu.Trigger>

			<ContextMenu.Content>
				<ContextMenu.Item key="download">
					<ContextMenu.ItemTitle>Download</ContextMenu.ItemTitle>

					<ContextMenu.ItemIcon
						ios={{
							name: 'arrow.down.circle',
						}}
					/>
				</ContextMenu.Item>
				<ContextMenu.Item key="favorite">
					<ContextMenu.ItemTitle>Favorite</ContextMenu.ItemTitle>

					<ContextMenu.ItemIcon
						ios={{
							name: 'star',
						}}
					/>
				</ContextMenu.Item>
			</ContextMenu.Content>
		</ContextMenu.Root>
	)
}
