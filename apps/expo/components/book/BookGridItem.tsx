import { FragmentType, graphql, useFragment } from '@stump/graphql'
import { View } from 'react-native'

import { useActiveServer } from '../activeServer'
import GridImageItem from '../grid/GridImageItem'

const fragment = graphql(`
	fragment BookGridItem on Media {
		id
		resolvedName
		thumbnail {
			url
		}
	}
`)

export type IBookGridItemFragment = FragmentType<typeof fragment>

type Props = {
	book: IBookGridItemFragment
}

export default function BookGridItem({ book }: Props) {
	const {
		activeServer: { id: serverID },
	} = useActiveServer()

	const data = useFragment(fragment, book)

	return (
		<View className="w-full items-center">
			<GridImageItem
				uri={data.thumbnail.url}
				title={data.resolvedName}
				href={`/server/${serverID}/books/${data.id}`}
			/>
		</View>
	)
}
