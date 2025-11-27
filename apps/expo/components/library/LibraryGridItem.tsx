import { useSDK } from '@stump/client'
import { FragmentType, graphql, useFragment } from '@stump/graphql'
import { useRouter } from 'expo-router'
import { Pressable, View } from 'react-native'

import { COLORS } from '~/lib/constants'
import { cn } from '~/lib/utils'
import { usePreferencesStore } from '~/stores'

import { useActiveServer } from '../activeServer'
import { useGridItemSize } from '../grid/useGridItemSize'
import { ThumbnailImage } from '../image'
import { Text } from '../ui'

const fragment = graphql(`
	fragment LibraryGridItem on Library {
		id
		name
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

export type ILibraryGridItemFragment = FragmentType<typeof fragment>

type Props = {
	library: ILibraryGridItemFragment
}

export default function LibraryGridItem({ library }: Props) {
	const { sdk } = useSDK()
	const {
		activeServer: { id: serverID },
	} = useActiveServer()
	const { itemDimension } = useGridItemSize()
	const router = useRouter()
	const data = useFragment(fragment, library)
	const thumbnailRatio = usePreferencesStore((state) => state.thumbnailRatio)

	const title = data.name
	const href = `/server/${serverID}/libraries/${data.id}`

	const { url: uri, metadata: placeholderData } = data.thumbnail

	return (
		<View className="w-full items-center">
			{/* @ts-expect-error: String path */}
			<Pressable onPress={() => router.navigate(href)}>
				{({ pressed }) => (
					<View className={cn('relative', { 'opacity-80': pressed })}>
						<ThumbnailImage
							source={{
								uri: uri,
								headers: {
									...sdk.customHeaders,
									Authorization: sdk.authorizationHeader || '',
								},
							}}
							resizeMode="stretch"
							size={{ height: itemDimension / thumbnailRatio, width: itemDimension }}
							placeholderData={placeholderData}
							gradient={{ colors: ['transparent', 'rgba(0, 0, 0, 0.50)', 'rgba(0, 0, 0, 0.85)'] }}
						/>

						<View className="absolute inset-0 z-20 w-full items-center justify-center">
							<Text
								size="2xl"
								className="font-bold leading-8 tracking-wide"
								numberOfLines={2}
								ellipsizeMode="tail"
								style={{
									maxWidth: itemDimension - 4,
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
