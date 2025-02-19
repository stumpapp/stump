import { useSDK } from '@stump/client'
import { Image } from 'expo-image'
import { Href, useRouter } from 'expo-router'
import { useEffect, useMemo, useState } from 'react'
import { View } from 'react-native'
import { Pressable } from 'react-native-gesture-handler'
import { getColors, ImageColorsResult } from 'react-native-image-colors'
import { match } from 'ts-pattern'

import { useDisplay } from '~/lib/hooks'
import { cn } from '~/lib/utils'

import { Text } from './ui'

type Props = {
	label?: string
	uri: string
	href: Href
}

export default function StackedEffectThumbnail({ label, uri, href }: Props) {
	const { width, isTablet } = useDisplay()
	const { sdk } = useSDK()

	const [colors, setColors] = useState<ImageColorsResult | null>(null)

	const itemDimension = useMemo(
		() =>
			width /
				// 2 columns on phones
				(isTablet ? 4 : 2) -
			20 * 2.5,
		[isTablet, width],
	)
	const accentDimension = useMemo(() => itemDimension + 3, [itemDimension])

	useEffect(() => {
		if (colors) return

		getColors(uri, {
			cache: true,
			key: uri,
		}).then(setColors)
	}, [uri, colors])

	const router = useRouter()

	return (
		<View className="gap-4">
			<View className="relative flex flex-1 flex-row">
				<Pressable style={{ zIndex: 10 }} onPress={() => router.push(href)}>
					{({ pressed }) => (
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
					)}
				</Pressable>

				<View
					className={cn(
						'absolute -left-1 top-0 aspect-[2/3] rotate-[-5deg] transform overflow-hidden rounded-lg',
						{
							'bg-background': !colors,
						},
					)}
					style={{
						height: accentDimension * 1.5,
						width: accentDimension,
						backgroundColor: getColor(colors),
						opacity: 0.75,
					}}
				/>

				<View
					className={cn(
						'absolute left-0 top-1 aspect-[2/3] rotate-[4deg] transform overflow-hidden rounded-lg',
						{
							'bg-background': !colors,
						},
					)}
					style={{
						height: accentDimension * 1.5,
						width: accentDimension,
						backgroundColor: getColor(colors),
						opacity: 0.75,
					}}
				/>
			</View>

			{label && (
				<Text size="xl" className="text-center font-semibold">
					{label}
				</Text>
			)}
		</View>
	)
}

const getColor = (colors: ImageColorsResult | null) => {
	if (!colors) return undefined

	return match(colors)
		.with({ platform: 'android' }, ({ average }) => average)
		.with({ platform: 'ios' }, ({ primary }) => primary)
		.otherwise(() => undefined)
}
