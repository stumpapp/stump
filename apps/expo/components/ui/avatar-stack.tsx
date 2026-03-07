import { View } from 'react-native'

import { cn } from '~/lib/utils'

import { Avatar, AvatarFallback, AvatarImage } from './avatar'
import { Text } from './text'

export type AvatarStackItem = {
	src?: string | null
	fallback?: string | null
	alt?: string | null
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
					className={cn('h-8 w-8 border border-background', index > 0 && '-ml-2', {
						'border-black/10 dark:border-white/20': !avatar.src,
					})}
				>
					{avatar.src && <AvatarImage source={{ uri: avatar.src, headers: requestHeaders }} />}
					<AvatarFallback className="bg-black/5 dark:bg-white/10">
						<Text className="text-[10px] font-medium text-foreground-muted">
							{avatar.fallback || '?'}
						</Text>
					</AvatarFallback>
				</Avatar>
			))}

			{overflowCount && overflowCount > 0 ? (
				<View className="bg-muted -ml-2 h-8 w-8 items-center justify-center rounded-full border-2 border-background">
					<Text className="text-[10px] font-medium text-foreground-muted">+{overflowCount}</Text>
				</View>
			) : null}
		</View>
	)
}
