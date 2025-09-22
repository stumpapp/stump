import { useSDK } from '@stump/client'
import { FragmentType, graphql, useFragment } from '@stump/graphql'
import { useRouter } from 'expo-router'
import pluralize from 'pluralize'
import { View } from 'react-native'
import { Pressable } from 'react-native-gesture-handler'

import { formatBytes } from '~/lib/format'
import { useDisplay } from '~/lib/hooks'

import { useActiveServer } from '../activeServer'
import { TurboImage } from '../Image'
import { Text } from '../ui'
import { BorderAndShadow } from '../BorderAndShadow'

const fragment = graphql(`
	fragment BookSearchItem on Media {
		id
		resolvedName
		thumbnail {
			url
		}
		size
		pages
	}
`)

export type IBookSearchItemFragment = FragmentType<typeof fragment>

type Props = {
	/**
	 * The query which was used that this book matches with. It will attempt to highlight
	 * the matching text in the title and/or description
	 */
	search?: string
	/**
	 * The book to display
	 */
	book: FragmentType<typeof fragment>
}

export default function BookSearchItem({ book }: Props) {
	const { sdk } = useSDK()
	const {
		activeServer: { id: serverID },
	} = useActiveServer()
	const { width } = useDisplay()
	const data = useFragment(fragment, book)
	const router = useRouter()

	return (
		<Pressable
			onPress={() => router.navigate(`/server/${serverID}/books/${data.id}`)}
			style={{
				width: width * 0.75,
			}}
		>
			<View className="flex-row items-start gap-4 p-4">
				<BorderAndShadow
					style={{ borderRadius: 4, borderWidth: 0.3, shadowRadius: 1.41, elevation: 2 }}
				>
					<TurboImage
						source={{
							uri: data.thumbnail.url,
							headers: {
								Authorization: sdk.authorizationHeader || '',
							},
						}}
						resizeMode="stretch"
						resize={75 * 1.5}
						style={{ width: 75, height: 75 / (2 / 3) }}
					/>
				</BorderAndShadow>

				<View className="flex flex-1 flex-col gap-1">
					<Text>{data.resolvedName}</Text>

					<Text className="text-foreground-muted">
						{formatBytes(data.size, 1)} • {data.pages} {pluralize('page', data.pages)}
					</Text>
				</View>
			</View>
		</Pressable>
	)
}
