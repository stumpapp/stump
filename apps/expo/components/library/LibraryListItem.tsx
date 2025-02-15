import { useRouter } from 'expo-router'
import React, { useMemo } from 'react'
import { useWindowDimensions, View } from 'react-native'
import { useActiveServer } from '../activeServer'
import { Library } from '@stump/sdk'
import { useSDK } from '@stump/client'
import { cn } from '~/lib/utils'
import { Image } from 'expo-image'
import { Text } from '../ui'
import { Pressable } from 'react-native-gesture-handler'

import * as ContextMenu from 'zeego/context-menu'

type Props = {
	library: Library
}

export default function LibraryListItem({ library }: Props) {
	const { width } = useWindowDimensions()
	const {
		activeServer: { id: serverID },
	} = useActiveServer()
	const { sdk } = useSDK()

	// iPad or other large screens can have more columns (i.e., smaller itemDimension) but most phones should have 2 columns
	const isTablet = useMemo(() => width > 768, [width])
	const itemDimension = useMemo(
		() =>
			width /
				// 2 columns on phones
				(isTablet ? 4 : 2) -
			16 * 2,
		[isTablet, width],
	)

	const router = useRouter()

	return (
		<ContextMenu.Root>
			<ContextMenu.Trigger>
				<Pressable onPress={() => router.push(`/server/${serverID}/libraries/${library.id}`)}>
					<View className="flex items-start gap-3">
						<View className={cn('aspect-[2/3] overflow-hidden rounded-lg', {})}>
							<Image
								source={{
									uri: sdk.library.thumbnailURL(library.id),
									headers: {
										Authorization: sdk.authorizationHeader,
									},
								}}
								contentFit="fill"
								style={{ height: itemDimension * 1.5, width: itemDimension }}
							/>
						</View>
						<Text className="pb-1 text-xl font-medium leading-6">{library.name}</Text>
					</View>
				</Pressable>
			</ContextMenu.Trigger>

			<ContextMenu.Content>
				<ContextMenu.Item key="download">
					<ContextMenu.ItemTitle>Download</ContextMenu.ItemTitle>

					<ContextMenu.ItemIcon
						ios={{
							name: 'arrow.down.circle',
						}}
					/>
				</ContextMenu.Item>
				<ContextMenu.Item key="favorite">
					<ContextMenu.ItemTitle>Favorite</ContextMenu.ItemTitle>

					<ContextMenu.ItemIcon
						ios={{
							name: 'star',
						}}
					/>
				</ContextMenu.Item>
			</ContextMenu.Content>
		</ContextMenu.Root>
	)
}
