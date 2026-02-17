import { useSDK } from '@stump/client'
import { FragmentType, graphql, useFragment } from '@stump/graphql'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Pressable, View } from 'react-native'

import { useActiveServer } from '../activeServer'
import { ThumbnailImage } from '../image'
import { Text } from '../ui'
import { getClubBookThumbnailData } from './utils'

const fragment = graphql(`
	fragment PastDiscussionsLink on BookClub {
		previousBook {
			imageUrl
			entity {
				__typename
				id
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
				}
			}
		}
		previousDiscussionsCount
	}
`)

type Props = {
	data: FragmentType<typeof fragment>
}

export function PastDiscussionsLink({ data }: Props) {
	const loadedData = useFragment(fragment, data)
	const router = useRouter()
	const {
		activeServer: { id: serverID },
	} = useActiveServer()
	const { sdk } = useSDK()
	const { clubId } = useLocalSearchParams<{ clubId: string }>()

	const imageProps = getClubBookThumbnailData(loadedData.previousBook, {
		getHeaders: () => ({
			...sdk.customHeaders,
			Authorization: sdk.authorizationHeader || '',
		}),
	})

	// Note: The lack of a previous book itself doesn't necessarily mean there are no past discussions
	const isLinkDisabled = loadedData.previousDiscussionsCount === 0

	// TODO(book-club): Render generic placeholder for thumb if no image
	// TODO(book-club): Add gradient background if data available
	// TODO(book-club): Technically possible to have isLinkDisabled && !imageProps, which if
	// the case would basically be an empty card...
	return (
		<Pressable
			onPress={() => router.push(`/server/${serverID}/clubs/${clubId}/archive`)}
			className="w-1/3 shrink-0 tablet:w-[120px]"
			disabled={isLinkDisabled}
		>
			<View className="squircle ios:rounded-[2rem] relative flex-grow flex-row gap-6 overflow-hidden rounded-3xl bg-black/5 p-3 dark:bg-white/10">
				{imageProps && (
					<View className="absolute inset-0 -bottom-2 flex-1 items-center justify-end">
						<ThumbnailImage
							key={imageProps.url}
							source={{
								uri: imageProps?.url || '',
								headers: imageProps?.headers,
							}}
							placeholderData={imageProps?.placeholderData}
							size={{
								width: 56,
								height: 80,
							}}
						/>
					</View>
				)}

				{isLinkDisabled && (
					<View className="items-end justify-end">
						<Text className="text-muted-foreground text-right text-base font-medium">
							No past discussions
						</Text>
					</View>
				)}
			</View>
		</Pressable>
	)
}
