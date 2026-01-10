import { FragmentType, graphql, useFragment } from '@stump/graphql'
import { View } from 'react-native'

import { useActiveServer } from '../activeServer'
import GridImageItem from '../grid/GridImageItem'

const fragment = graphql(`
	fragment SeriesGridItem on Series {
		id
		resolvedName
		thumbnail {
			url
			metadata {
				averageColor
				colors {
					color
					percentage
				}
				thumbhash
			}
		}
	}
`)

export type ISeriesGridItemFragment = FragmentType<typeof fragment>

type Props = {
	series: ISeriesGridItemFragment
}

export default function SeriesGridItem({ series }: Props) {
	const {
		activeServer: { id: serverID },
	} = useActiveServer()
	const data = useFragment(fragment, series)

	return (
		<View className="w-full items-center">
			<GridImageItem
				uri={data.thumbnail.url}
				title={data.resolvedName}
				href={`/server/${serverID}/series/${data.id}`}
				placeholderData={data.thumbnail.metadata}
			/>
		</View>
	)
}
