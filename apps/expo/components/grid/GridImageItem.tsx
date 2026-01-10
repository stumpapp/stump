import { useSDK } from '@stump/client'
import { Href, useRouter } from 'expo-router'
import { Pressable, View } from 'react-native'

import { cn } from '~/lib/utils'
import { usePreferencesStore } from '~/stores'

import { ThumbnailImage } from '../image'
import { ThumbnailPlaceholderData } from '../image/ThumbnailPlaceholder'
import { Text } from '../ui'
import { useGridItemSize } from './useGridItemSize'

type Props = {
	uri: string
	title: string
	href: Href
	placeholderData?: ThumbnailPlaceholderData | null
}

export default function GridImageItem({ uri, title, href, ...thumbnailProps }: Props) {
	const { sdk } = useSDK()
	const { itemWidth } = useGridItemSize()

	const router = useRouter()
	const thumbnailRatio = usePreferencesStore((state) => state.thumbnailRatio)

	return (
		<Pressable onPress={() => router.navigate(href)}>
			{({ pressed }) => (
				<View className={cn('flex-1 gap-2 pb-4', { 'opacity-80': pressed })}>
					<ThumbnailImage
						source={{
							uri: uri,
							headers: {
								...sdk.customHeaders,
								Authorization: sdk.authorizationHeader || '',
							},
						}}
						resizeMode="stretch"
						size={{ height: itemWidth / thumbnailRatio, width: itemWidth }}
						{...thumbnailProps}
					/>

					<Text
						size="xl"
						className="font-medium leading-6"
						numberOfLines={2}
						ellipsizeMode="tail"
						style={{
							maxWidth: itemWidth - 4,
						}}
					>
						{title}
					</Text>
				</View>
			)}
		</Pressable>
	)
}
