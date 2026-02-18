import { View } from 'react-native'

import { cn } from '~/lib/utils'

import { Avatar, AvatarFallback, AvatarImage } from './avatar'
import { Text } from './text'

export type AvatarStackItem = {
	src?: string | null
	fallback?: string
	alt?: string
}

type AvatarStackProps = {
	avatars: AvatarStackItem[]
	overflowCount?: number
	className?: string
	requestHeaders?: Record<string, string>
}

export function AvatarStack({
	avatars,
	overflowCount,
	className,
	requestHeaders,
}: AvatarStackProps) {
	return (
		<View className={cn('flex-row items-center', className)}>
			{avatars.map((avatar, index) => (
				<Avatar
					alt={avatar.alt || avatar.fallback || 'Avatar'}
					key={index}
					className={cn('h-6 w-6 border-2 border-background', index > 0 && '-ml-2')}
				>
					{avatar.src && <AvatarImage source={{ uri: avatar.src, headers: requestHeaders }} />}
					<AvatarFallback>
						<Text className="text-muted-foreground text-[10px] font-medium">
							{avatar.fallback || '?'}
						</Text>
					</AvatarFallback>
				</Avatar>
			))}

			{overflowCount && overflowCount > 0 ? (
				<View className="bg-muted -ml-2 h-6 w-6 items-center justify-center rounded-full border-2 border-background">
					<Text className="text-muted-foreground text-[10px] font-medium">+{overflowCount}</Text>
				</View>
			) : null}
		</View>
	)
}
