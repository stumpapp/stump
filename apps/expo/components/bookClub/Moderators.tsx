import { useSDK } from '@stump/client'
import { View } from 'react-native'

import { cn } from '~/lib/utils'

import { Avatar, AvatarFallback, AvatarImage, AvatarStack, Text } from '../ui'

type Props = {
	moderators: Array<{
		id: string
		displayName?: string | null
		avatarUrl?: string | null
	}>
}

export function Moderators({ moderators }: Props) {
	const { sdk } = useSDK()

	const headers = {
		...sdk.customHeaders,
		Authorization: sdk.authorizationHeader || '',
	}

	if (moderators.length > 1) {
		return (
			<AvatarStack
				avatars={moderators
					.map((moderator) => ({
						src: moderator.avatarUrl,
						fallback: getFallback(moderator.displayName),
					}))
					.slice(0, 3)}
				overflowCount={moderators.length - 3}
				requestHeaders={headers}
			/>
		)
	}

	const moderator = moderators[0]
	if (!moderator) return null

	return (
		<View className="flex-row items-center gap-2">
			<Avatar
				alt={moderator.displayName || 'Moderator'}
				className={cn('h-8 w-8 border border-background', {
					'border-black/10 dark:border-white/20': !moderator.avatarUrl,
				})}
			>
				{moderator.avatarUrl && <AvatarImage source={{ uri: moderator.avatarUrl, headers }} />}
				<AvatarFallback className="bg-black/5 dark:bg-white/10">
					<Text className="text-[10px] font-medium text-foreground-muted">
						{getFallback(moderator.displayName)}
					</Text>
				</AvatarFallback>
			</Avatar>
			<Text className="text-sm text-foreground">{moderator.displayName}</Text>
		</View>
	)
}

const getFallback = (name?: string | null) => name?.charAt(0).toUpperCase() || '?'
