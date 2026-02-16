import { useSDK } from '@stump/client'
import { BookClubsScreenQuery } from '@stump/graphql'
import { useRouter } from 'expo-router'
import pluralize from 'pluralize'
import { Pressable, Text, View } from 'react-native'
import { match, P } from 'ts-pattern'

import { useActiveServer } from '../activeServer'
import { ThumbnailImage } from '../image'
import { AvatarStack, Card, Heading } from '../ui'

type BookClub = BookClubsScreenQuery['bookClubs'][number]

// TODO: It might be better to maybe let the club pick a static image for itself
// or highlighted book(s) instead of using the current for thumb. If there isn't a
// current book then nothing is used...

export function BookClubCard({ club }: { club: BookClub }) {
	const router = useRouter()
	const {
		activeServer: { id: serverID },
	} = useActiveServer()
	const { sdk } = useSDK()

	const imageProps = match(club.currentBook)
		.with({ entity: { __typename: 'Media' } }, ({ entity: media }) => ({
			url: media.thumbnail.url,
			placeholderData: media.thumbnail.metadata,
			headers: {
				...sdk.customHeaders,
				Authorization: sdk.authorizationHeader || '',
			},
		}))
		.with({ imageUrl: P.string }, ({ imageUrl }) => ({
			url: imageUrl!,
			headers: undefined,
			placeholderData: undefined,
		}))
		.otherwise(() => null)

	const avatars = club.members.slice(0, 3).map((member) => ({
		src: member.avatarUrl,
		fallback: member.displayName?.charAt(0).toUpperCase() || '?',
	}))

	const overflowCount = club.membersCount > 3 ? club.membersCount - 3 : undefined

	return (
		<Pressable
			onPress={() => router.push(`/server/${serverID}/clubs/${club.id}`)}
			className="w-full"
		>
			<Card>
				<Card.Row className="flex-row items-start gap-3">
					<ThumbnailImage
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

					<View className="flex-1 justify-between gap-4">
						<View className="gap-1">
							<Heading className="font-medium">{club.name}</Heading>
							{club.description && (
								<Text className="text-muted-foreground" numberOfLines={2}>
									{club.description}
								</Text>
							)}
						</View>

						<View className="flex-row items-center gap-2">
							<AvatarStack avatars={avatars} overflowCount={overflowCount} size="sm" />
							<Text className="text-muted-foreground text-sm">
								{pluralize('member', club.membersCount, true)}
							</Text>
						</View>
					</View>
				</Card.Row>
			</Card>
		</Pressable>
	)
}
