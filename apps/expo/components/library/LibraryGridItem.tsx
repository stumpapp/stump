import { useSDK } from '@stump/client'
import { FragmentType, graphql, useFragment } from '@stump/graphql'
import { useRouter } from 'expo-router'
import { View } from 'react-native'
import { Pressable } from 'react-native-gesture-handler'
import LinearGradient from 'react-native-linear-gradient'

import { COLORS } from '~/lib/constants'
import { cn } from '~/lib/utils'

import { useActiveServer } from '../activeServer'
import { useGridItemSize } from '../grid/useGridItemSize'
import { FasterImage } from '../Image'
import { Text } from '../ui'

const fragment = graphql(`
	fragment LibraryGridItem on Library {
		id
		name
		thumbnail {
			url
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

	const uri = data.thumbnail?.url ?? undefined
	const title = data.name
	const href = `/server/${serverID}/libraries/${data.id}`

	return (
		// @ts-expect-error: String path
		<Pressable onPress={() => router.navigate(href)}>
			{({ pressed }) => (
				<View
					className={cn('relative', {
						'opacity-80': pressed,
					})}
					style={{
						height: itemDimension * 1.5,
						width: itemDimension,
					}}
				>
					<LinearGradient
						colors={['transparent', 'rgba(0, 0, 0, 0.80)']}
						style={{ position: 'absolute', inset: 0, zIndex: 10, borderRadius: 8 }}
					/>

					<FasterImage
						source={{
							url: uri,
							headers: {
								Authorization: sdk.authorizationHeader || '',
							},
							resizeMode: 'cover',
							borderRadius: 8,
							cachePolicy: 'discWithCacheControl',
						}}
						style={{
							height: '100%',
							width: '100%',
						}}
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
	)
}
