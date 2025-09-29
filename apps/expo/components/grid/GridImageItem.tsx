import { useSDK } from '@stump/client'
import { Href, useRouter } from 'expo-router'
import { Pressable, View } from 'react-native'

import { cn } from '~/lib/utils'
import { usePreferencesStore } from '~/stores'

import { BorderAndShadow } from '../BorderAndShadow'
import { TurboImage } from '../Image'
import { Text } from '../ui'
import { useGridItemSize } from './useGridItemSize'

type Props = {
	uri: string
	title: string
	href: Href
}

export default function GridImageItem({ uri, title, href }: Props) {
	const { sdk } = useSDK()
	const { itemDimension } = useGridItemSize()

	const router = useRouter()
	const thumbnailRatio = usePreferencesStore((state) => state.thumbnailRatio)

	return (
		<Pressable onPress={() => router.navigate(href)}>
			{({ pressed }) => (
				<View className={cn('flex-1 gap-2 pb-4', { 'opacity-80': pressed })}>
					<BorderAndShadow
						style={{ borderRadius: 8, borderWidth: 0.3, shadowRadius: 1.41, elevation: 2 }}
					>
						<TurboImage
							source={{
								uri: uri,
								headers: {
									...sdk.customHeaders,
									Authorization: sdk.authorizationHeader || '',
								},
							}}
							resizeMode="stretch"
							resize={itemDimension * 1.5}
							style={{ height: itemDimension / thumbnailRatio, width: itemDimension }}
						/>
					</BorderAndShadow>

					<Text
						size="xl"
						className="font-medium leading-6"
						numberOfLines={2}
						ellipsizeMode="tail"
						style={{
							maxWidth: itemDimension - 4,
						}}
					>
						{title}
					</Text>
				</View>
			)}
		</Pressable>
	)
}
