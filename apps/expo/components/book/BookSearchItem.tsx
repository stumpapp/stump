import { useSDK } from '@stump/client'
import { FragmentType, graphql, useFragment } from '@stump/graphql'
import { useRouter } from 'expo-router'
import pluralize from 'pluralize'
import { Pressable, View } from 'react-native'

import { formatBytes } from '~/lib/format'
import { useDisplay } from '~/lib/hooks'
import { usePreferencesStore } from '~/stores'

import { useActiveServer } from '../activeServer'
import { ThumbnailImage } from '../image'
import { Text } from '../ui'

const fragment = graphql(`
	fragment BookSearchItem on Media {
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
	const thumbnailRatio = usePreferencesStore((state) => state.thumbnailRatio)

	const { url: uri, metadata: placeholderData } = data.thumbnail

	return (
		<Pressable
			onPress={() => router.navigate(`/server/${serverID}/books/${data.id}`)}
			style={{
				width: width * 0.75,
			}}
		>
			<View className="flex-row items-start gap-4 px-6 py-2 tablet:px-10">
				<ThumbnailImage
					source={{
						uri,
						headers: {
							...sdk.customHeaders,
							Authorization: sdk.authorizationHeader || '',
						},
					}}
					resizeMode="stretch"
					size={{ height: 75 / thumbnailRatio, width: 75 }}
					placeholderData={placeholderData}
				/>

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
