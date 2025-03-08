import { useSDK } from '@stump/client'
import { Href, useRouter } from 'expo-router'
import { View } from 'react-native'
import { Pressable } from 'react-native-gesture-handler'

import { cn } from '~/lib/utils'

import { FasterImage } from '../Image'
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
					className={cn('flex-1 gap-2 px-4 pb-4', {
						'mr-auto': index % 2 === 0,
						'ml-auto': index % 2 === 1,
					})}
				>
					<View
						className={cn({
							'opacity-80': pressed,
						})}
						style={{
							height: itemDimension * 1.5,
							width: itemDimension,
						}}
					>
						<FasterImage
							source={{
								url: uri,
								headers: {
									Authorization: sdk.authorizationHeader || '',
								},
								resizeMode: 'cover',
								borderRadius: 8,
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
