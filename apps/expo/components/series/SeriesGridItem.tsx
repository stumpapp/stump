import { FragmentType, graphql, useFragment } from '@stump/graphql'
import { useRouter } from 'expo-router'
import { View } from 'react-native'

import { useActiveServer } from '../activeServer'
import GridImageItem from '../listLayout/grid/GridImageItem'

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
			height
			width
		}
		isComplete
	}
`)

export type ISeriesGridItemFragment = FragmentType<typeof fragment>

type Props = {
	series: ISeriesGridItemFragment
	onPress?: () => void
}

// TODO(ask): Ask folks if they want progression indicators in series grids
export default function SeriesGridItem({ series, onPress }: Props) {
	const router = useRouter()
	const {
		activeServer: { id: serverID },
	} = useActiveServer()
	const data = useFragment(fragment, series)

	// TODO: a different color when series is ongoing and/or num issues on stump finished < total from meta?
	return (
		<View className="w-full items-center">
			<GridImageItem
				uri={data.thumbnail.url}
				title={data.resolvedName}
				onPress={onPress ?? (() => router.navigate(`/server/${serverID}/series/${data.id}`))}
				placeholderData={data.thumbnail.metadata}
				originalDimensions={
					data.thumbnail.width && data.thumbnail.height
						? { width: data.thumbnail.width, height: data.thumbnail.height }
						: null
				}
				percentageCompleted={data.isComplete ? 100 : undefined}
			/>
		</View>
	)
}
