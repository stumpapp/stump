import { useSDK } from '@stump/client'
import { OPDSPublication, resolveUrl } from '@stump/sdk'
import { useRouter } from 'expo-router'
import { Pressable, View } from 'react-native'

import { cn } from '~/lib/utils'
import { usePreferencesStore } from '~/stores'

import { useActiveServer } from '../activeServer'
import { ThumbnailImage } from '../image'
import { Text } from '../ui'
import { getPublicationThumbnailURL } from './utils'

type Props = {
	item: OPDSPublication
}

export function RelatedPublicationItem({ item }: Props) {
	const { sdk } = useSDK()
	const {
		activeServer: { id: serverID },
	} = useActiveServer()
	const router = useRouter()

	const selfLink = item.links?.find((link) => link.rel === 'self')?.href
	const resolvedPublicationURL = selfLink ? resolveUrl(selfLink, sdk.rootURL) : undefined
	const thumbnail = getPublicationThumbnailURL(item, sdk.rootURL)

	const thumbnailRatio = usePreferencesStore((state) => state.thumbnailRatio)

	if (!resolvedPublicationURL || !thumbnail) {
		return null
	}

	return (
		<Pressable
			onPress={() =>
				router.push({
					pathname: '/opds/[id]/publication',
					params: {
						id: serverID,
						url: resolvedPublicationURL,
					},
				})
			}
		>
			{({ pressed }) => (
				<View className={cn('flex items-start pr-3', { 'opacity-80': pressed })}>
					<ThumbnailImage
						source={{
							uri: thumbnail,
							headers: {
								...sdk.customHeaders,
								Authorization: sdk.authorizationHeader || '',
							},
						}}
						resizeMode="cover"
						size={{ height: 110 / thumbnailRatio, width: 110 }}
					/>

					<Text className="mt-2" style={{ maxWidth: 106 }} numberOfLines={2}>
						{item.metadata.title}
					</Text>
				</View>
			)}
		</Pressable>
	)
}
