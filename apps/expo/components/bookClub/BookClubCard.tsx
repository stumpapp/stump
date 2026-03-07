import { useSDK } from '@stump/client'
import { FragmentType, graphql, useFragment } from '@stump/graphql'
import { useRouter } from 'expo-router'
import pluralize from 'pluralize'
import { Pressable, Text, View } from 'react-native'

import { useActiveServer } from '../activeServer'
import { ThumbnailImage } from '../image'
import { AvatarStack, Card, Heading } from '../ui'
import { getClubBookThumbnailData } from './utils'

const fragment = graphql(`
	fragment BookClubCard on BookClub {
		id
		name
		slug
		description
		membersCount
		members {
			id
			displayName
			avatarUrl
		}
		currentBook {
			id
			imageUrl
			title
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
	}
`)

// TODO: It might be better to maybe let the club pick a static image for itself
// or highlighted book(s) instead of using the current for thumb. If there isn't a
// current book then nothing is used...

type Props = {
	club: FragmentType<typeof fragment>
}

export function BookClubCard({ club }: Props) {
	const data = useFragment(fragment, club)
	const router = useRouter()
	const {
		activeServer: { id: serverID },
	} = useActiveServer()
	const { sdk } = useSDK()

	const imageProps = getClubBookThumbnailData(data.currentBook, {
		getHeaders: () => ({
			...sdk.customHeaders,
			Authorization: sdk.authorizationHeader || '',
		}),
	})

	const avatars = data.members.slice(0, 3).map((member) => ({
		src: member.avatarUrl,
		fallback: member.displayName?.charAt(0).toUpperCase() || '?',
	}))

	const overflowCount = data.membersCount > 3 ? data.membersCount - 3 : undefined

	return (
		<Pressable
			onPress={() => router.push(`/server/${serverID}/clubs/${data.id}`)}
			className="w-full"
		>
			<Card>
				<Card.Row className="flex-row items-start gap-3">
					<ThumbnailImage
						key={imageProps?.url}
						source={{
							uri: imageProps?.url || '',
							headers: imageProps?.headers,
						}}
						placeholderData={imageProps?.placeholderData}
						size={{
							width: 56,
							height: 80,
						}}
						resizeMode="cover"
					/>

					<View className="flex-1 justify-between gap-4">
						<View className="gap-1">
							<Heading className="font-medium">{data.name}</Heading>
							{data.description && (
								<Text className="text-foreground-muted" numberOfLines={2}>
									{data.description}
								</Text>
							)}
						</View>

						<View className="flex-row items-center gap-2">
							<AvatarStack
								avatars={avatars}
								overflowCount={overflowCount}
								requestHeaders={{
									...sdk.customHeaders,
									Authorization: sdk.authorizationHeader || '',
								}}
							/>
							<Text className="text-sm text-foreground-muted">
								{pluralize('member', data.membersCount, true)}
							</Text>
						</View>
					</View>
				</Card.Row>
			</Card>
		</Pressable>
	)
}
