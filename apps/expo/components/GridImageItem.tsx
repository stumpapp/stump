import { useSDK } from '@stump/client'
import { Image } from 'expo-image'
import { Href, useRouter } from 'expo-router'
import { useMemo } from 'react'
import { View } from 'react-native'
import { Pressable } from 'react-native-gesture-handler'

import { useDisplay } from '~/lib/hooks'
import { cn } from '~/lib/utils'

import { Text } from './ui'

type Props = {
	uri: string
	title: string
	href: Href
}

export default function GridImageItem({ uri, title, href }: Props) {
	const { width, isTablet } = useDisplay()
	const { sdk } = useSDK()

	const itemDimension = useMemo(
		() =>
			width /
				// 2 columns on phones
				(isTablet ? 4 : 2) -
			16 * 2,
		[isTablet, width],
	)

	const router = useRouter()

	const truncatedTitle = title.length > 33 ? `${title.slice(0, 30)}...` : title

	return (
		<Pressable onPress={() => router.navigate(href)}>
			{({ pressed }) => (
				<View className="flex items-start justify-start gap-4">
					<View
						className={cn('aspect-[2/3] overflow-hidden rounded-lg', {
							'opacity-80': pressed,
						})}
					>
						<Image
							source={{
								uri,
								headers: {
									Authorization: sdk.authorizationHeader,
								},
							}}
							contentFit="fill"
							style={{ height: itemDimension * 1.5, width: itemDimension }}
						/>
					</View>

					<Text className="pb-1 text-xl font-medium leading-6">{truncatedTitle}</Text>
				</View>
			)}
		</Pressable>
	)
}
