import { FragmentType, graphql, useFragment } from '@stump/graphql'
import { useRouter } from 'expo-router'
import { View } from 'react-native'

import { useActiveServer } from '../activeServer'
import GridImageItem from '../grid/GridImageItem'

const fragment = graphql(`
	fragment BookGridItem on Media {
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
		readProgress {
			percentageCompleted
		}
	}
`)

export type IBookGridItemFragment = FragmentType<typeof fragment>

type Props = {
	book: IBookGridItemFragment
	onPress?: () => void
}

export default function BookGridItem({ book, onPress }: Props) {
	const router = useRouter()
	const {
		activeServer: { id: serverID },
	} = useActiveServer()

	const data = useFragment(fragment, book)

	const percentageCompleted = parseFloat(data.readProgress?.percentageCompleted)

	return (
		<View className="w-full items-center">
			<GridImageItem
				uri={data.thumbnail.url}
				title={data.resolvedName}
				onPress={onPress ?? (() => router.navigate(`/server/${serverID}/books/${data.id}`))}
				placeholderData={data.thumbnail.metadata}
				originalDimensions={
					data.thumbnail.width && data.thumbnail.height
						? { width: data.thumbnail.width, height: data.thumbnail.height }
						: null
				}
				percentageCompleted={isNaN(percentageCompleted) ? undefined : percentageCompleted}
			/>
		</View>
	)
}
