import { useSDK } from '@stump/client'
import { FragmentType, graphql, useFragment } from '@stump/graphql'
import { useRouter } from 'expo-router'
import { memo } from 'react'
import { Platform, View } from 'react-native'
import { Pressable } from 'react-native-gesture-handler'
import LinearGradient from 'react-native-linear-gradient'

import { COLORS } from '~/lib/constants'

import { useActiveServer } from '../activeServer'
import { FasterImage } from '../Image'
import { Text } from '../ui'

const fragment = graphql(`
	fragment OnDeckBookItem on Media {
		id
		resolvedName
		thumbnail {
			url
		}
		seriesPosition
		series {
			mediaCount
		}
	}
`)

export type OnDeckBookItemFragmentType = FragmentType<typeof fragment>

type Props = {
	book: OnDeckBookItemFragmentType
}

function OnDeckBookItem({ book }: Props) {
	const data = useFragment(fragment, book)

	const { sdk } = useSDK()
	const {
		activeServer: { id: serverID },
	} = useActiveServer()

	const router = useRouter()

	return (
		<Pressable onPress={() => router.navigate(`/server/${serverID}/books/${data.id}`)}>
			{({ pressed }) => (
				<View
					className="relative"
					style={{
						opacity: pressed ? 0.75 : 1,
					}}
				>
					<LinearGradient
						colors={['transparent', 'rgba(0, 0, 0, 0.85)']}
						style={{ position: 'absolute', inset: 0, zIndex: 10, borderRadius: 8 }}
					/>

					<FasterImage
						source={{
							url: data.thumbnail.url,
							headers: {
								Authorization: sdk.authorizationHeader || '',
							},
							resizeMode: 'fill',
							// FIXME: I REALLY shouldn't have to do this
							borderRadius: Platform.OS === 'android' ? 24 : 8,
						}}
						style={{ width: 200 * (2 / 3), height: 200 }}
					/>

					<View className="absolute bottom-0 z-20 w-full gap-1 p-2">
						<Text
							className="flex-1 flex-wrap text-lg font-semibold leading-5"
							style={{
								textShadowOffset: { width: 2, height: 1 },
								textShadowRadius: 2,
								textShadowColor: 'rgba(0, 0, 0, 0.5)',
								zIndex: 20,
								color: COLORS.dark.foreground.DEFAULT,
							}}
							numberOfLines={2}
						>
							{data.resolvedName}
						</Text>
						{data.seriesPosition != null && (
							<Text
								className="flex-1 flex-wrap text-sm font-medium"
								style={{
									textShadowOffset: { width: 2, height: 1 },
									textShadowRadius: 2,
									textShadowColor: 'rgba(0, 0, 0, 0.5)',
									zIndex: 20,
									color: COLORS.dark.foreground.subtle,
								}}
								numberOfLines={0}
							>
								{data.seriesPosition} of {data.series?.mediaCount ?? '?'}
							</Text>
						)}
					</View>
				</View>
			)}
		</Pressable>
	)
}

export default memo(OnDeckBookItem)
