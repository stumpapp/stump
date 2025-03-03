import { useSDK } from '@stump/client'
import { Href, useRouter } from 'expo-router'
import { View } from 'react-native'
import { Pressable } from 'react-native-gesture-handler'

import { cn } from '~/lib/utils'

import { Image } from '../Image'
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

	return (
		<Pressable onPress={() => router.navigate(href)}>
			{({ pressed }) => (
				<View
					className="flex items-start justify-start gap-2"
					style={{
						// 8*2 gap, 20 font, 4 padding + additional 4 padding
						height: itemDimension * 1.5 + 16 + 20 + 4 * 2,
					}}
				>
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

					<Text size="xl" className="font-medium leading-6" numberOfLines={2} ellipsizeMode="tail">
						{title}
					</Text>
				</View>
			)}
		</Pressable>
	)
}
