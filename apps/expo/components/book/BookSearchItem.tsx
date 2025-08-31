import { useSDK } from '@stump/client'
import { FragmentType, graphql, useFragment } from '@stump/graphql'
import { useRouter } from 'expo-router'
import pluralize from 'pluralize'
import { View } from 'react-native'
import { Pressable } from 'react-native-gesture-handler'

import { formatBytes } from '~/lib/format'
import { useDisplay } from '~/lib/hooks'

import { useActiveServer } from '../activeServer'
import { FasterImage } from '../Image'
import { Text } from '../ui'

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
			<View className="flex-row items-start gap-4 py-4">
				<FasterImage
					source={{
						url: data.thumbnail.url,
						headers: {
							Authorization: sdk.authorizationHeader || '',
						},
						resizeMode: 'fill',
						borderRadius: 8,
					}}
					style={{ width: 75, height: 75 / (2 / 3) }}
				/>

				<View className="flex flex-1 flex-col gap-1">
					<Text>{data.resolvedName}</Text>

					<Text className="text-foreground-muted">
						{formatBytes(data.size)} • {data.pages} {pluralize('page', data.pages)}
					</Text>
				</View>
			</View>
		</Pressable>
	)
}
