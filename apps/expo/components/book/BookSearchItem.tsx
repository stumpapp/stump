import { useSDK } from '@stump/client'
import { formatBytes } from '@stump/client'
import { FragmentType, graphql, useFragment } from '@stump/graphql'
import { useRouter } from 'expo-router'
import pluralize from 'pluralize'
import { Pressable, View } from 'react-native'

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
			height
			width
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

	const {
		url: uri,
		metadata: placeholderData,
		width: originalWidth,
		height: originalHeight,
	} = data.thumbnail

	return (
		<Pressable
			onPress={() => router.navigate(`/server/${serverID}/books/${data.id}`)}
			style={{
				width: width * 0.75,
			}}
		>
			<View className="gap-4 px-6 py-2 tablet:px-10 flex-row items-start">
				<ThumbnailImage
					source={{
						uri,
						headers: {
							...sdk.customHeaders,
							Authorization: sdk.authorizationHeader || '',
						},
					}}
					size={{ height: 75 / thumbnailRatio, width: 75 }}
					placeholderData={placeholderData}
					originalDimensions={
						originalWidth && originalHeight
							? { width: originalWidth, height: originalHeight }
							: null
					}
				/>

				<View className="gap-1 flex flex-1 flex-col">
					<Text>{data.resolvedName}</Text>

					<Text className="text-foreground-muted">
						{formatBytes(data.size)} • {data.pages} {pluralize('page', data.pages)}
					</Text>
				</View>
			</View>
		</Pressable>
	)
}
