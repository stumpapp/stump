import { FragmentType, graphql, InterfaceLayout, useFragment } from '@stump/graphql'
import { useRouter } from 'expo-router'
import { View } from 'react-native'

import { useActiveServer } from '../activeServer'
import GridImageItem from '../listLayout/grid/GridImageItem'
import { ListRowItem } from '../listLayout/list'
import { Text } from '../ui'

const fragment = graphql(`
	fragment SeriesListItem on Series {
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
		mediaCount
		readCount
	}
`)

export type ISeriesListItemFragment = FragmentType<typeof fragment>

type Props = {
	layout: InterfaceLayout
	series: ISeriesListItemFragment
	onPress?: () => void
}

export default function SeriesListItem({ layout, series, onPress }: Props) {
	const router = useRouter()
	const {
		activeServer: { id: serverID },
	} = useActiveServer()
	const data = useFragment(fragment, series)

	const sharedProps = {
		uri: data.thumbnail.url,
		title: data.resolvedName,
		onPress: onPress ?? (() => router.navigate(`/server/${serverID}/series/${data.id}`)),
		placeholderData: data.thumbnail.metadata,
		originalDimensions:
			data.thumbnail.width && data.thumbnail.height
				? { width: data.thumbnail.width, height: data.thumbnail.height }
				: null,
		percentageCompleted: data.isComplete ? 100 : undefined,
	}

	if (layout === InterfaceLayout.Grid) {
		// TODO: a different color when series is ongoing and/or num issues on stump finished < total from meta?
		return (
			<View className="w-full items-center">
				<GridImageItem {...sharedProps} />
			</View>
		)
	}

	// just demonstration, figure out what else
	const infoItems = (
		<>
			<View className="squircle px-2.5 py-0.5 bg-black/5 dark:bg-white/10 flex-row items-end rounded-full">
				<Text size="sm">{data.readCount}</Text>
				<Text size="xs" className="pb-0.5 text-foreground-muted">{` / ${data.mediaCount}`}</Text>
			</View>
		</>
	)

	return <ListRowItem {...sharedProps} infoItems={infoItems} />
}
