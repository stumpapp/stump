import { FragmentType, graphql, useFragment } from '@stump/graphql'

import { useActiveServer } from '../activeServer'
import GridImageItem from '../grid/GridImageItem'

const fragment = graphql(`
	fragment SeriesGridItem on Series {
		id
		resolvedName
		thumbnail {
			url
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
		<GridImageItem
			uri={data.thumbnail.url}
			title={data.resolvedName}
			href={`/server/${serverID}/series/${data.id}`}
		/>
	)
}
