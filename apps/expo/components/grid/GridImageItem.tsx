import { useSDK } from '@stump/client'
import { Image } from 'expo-image'
import { Href, useRouter } from 'expo-router'
import { View } from 'react-native'
import { Pressable } from 'react-native-gesture-handler'

import { cn } from '~/lib/utils'

import { Text } from '../ui'
import { useGridItemSize } from './useGridItemSize'

type Props = {
	uri: string
	title: string
	href: Href
	index: number
}

export default function GridImageItem({ uri, title, href, index }: Props) {
	const { sdk } = useSDK()

	const { itemDimension } = useGridItemSize()

	const router = useRouter()

	return (
		<Pressable onPress={() => router.navigate(href)}>
			{({ pressed }) => (
				<View
					className={cn('flex-1 gap-2 pb-4', {
						'mr-auto': index % 2 === 0,
						'ml-auto': index % 2 === 1,
					})}
				>
					<View
						className={cn('overflow-hidden rounded-lg', {
							'opacity-80': pressed,
						})}
						style={{
							height: itemDimension * 1.5,
							width: itemDimension,
						}}
					>
						<Image
							source={{
								uri,
								headers: {
									Authorization: sdk.authorizationHeader,
								},
							}}
							style={{
								height: '100%',
								width: '100%',
							}}
						/>
					</View>

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
