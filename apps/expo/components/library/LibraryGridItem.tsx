import { FragmentType, graphql, useFragment } from '@stump/graphql'
import { useRouter } from 'expo-router'
import { Pressable, View } from 'react-native'

import { COLORS } from '~/lib/constants'
import { cn } from '~/lib/utils'
import { useActiveServer } from '~/providers/ActiveServerProvider'

import { CollectionStackedThumbnails } from '../image/collection-image'
import { Text } from '../ui'

const fragment = graphql(`
	fragment LibraryGridItem on Library {
		id
		name
		series(take: 5) {
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
		}
	}
`)

export type ILibraryGridItemFragment = FragmentType<typeof fragment>

type Props = {
	library: ILibraryGridItemFragment
	getLayoutNumber: (id: string, itemCount: number) => number | undefined
}

export default function LibraryGridItem({ library, getLayoutNumber }: Props) {
	const {
		activeServer: { id: serverID },
	} = useActiveServer()
	const router = useRouter()
	const data = useFragment(fragment, library)

	const title = data.name
	const href = `/stump/${serverID}/libraries/${data.id}`

	const thumbnailData = data.series.map((s) => s.thumbnail)

	const layoutNumber = getLayoutNumber(data.id, thumbnailData.length)

	return (
		<View className="w-full items-center">
			{/* @ts-expect-error: String path */}
			<Pressable onPress={() => router.navigate(href)}>
				{({ pressed }) => (
					<View className={cn('relative', { 'opacity-80': pressed })}>
						<CollectionStackedThumbnails
							thumbnailData={thumbnailData}
							layoutNumber={layoutNumber}
						/>

						<View className="bottom-0 left-0 px-4 py-2 absolute z-20 w-full">
							<Text
								size="2xl"
								className="font-bold leading-8 tracking-wide"
								numberOfLines={1}
								ellipsizeMode="tail"
								style={{
									textShadowOffset: { width: 2, height: 1 },
									textShadowRadius: 2,
									textShadowColor: 'rgba(0, 0, 0, 0.5)',
									zIndex: 20,
									color: COLORS.dark.foreground.DEFAULT,
								}}
							>
								{title}
							</Text>
						</View>
					</View>
				)}
			</Pressable>
		</View>
	)
}
