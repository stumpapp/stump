import { useSDK } from '@stump/client'
import { Series } from '@stump/sdk'

import { useActiveServer } from '../activeServer'
import GridImageItem from '../GridImageItem'

type Props = {
	series: Series
}

export default function SeriesGridItem({ series }: Props) {
	const {
		activeServer: { id: serverID },
	} = useActiveServer()
	const { sdk } = useSDK()

	return (
		<GridImageItem
			uri={sdk.series.thumbnailURL(series.id)}
			title={series.metadata?.title || series.name}
			href={`/server/${serverID}/series/${series.id}`}
		/>
	)
}
