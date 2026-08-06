import { View } from 'react-native'

import { useTranslate } from '~/lib/hooks'
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
	const { t } = useTranslate()

	return (
		<View className={cn('flex-row items-center', className)}>
			{avatars.map((avatar, index) => (
				<Avatar
					alt={avatar.alt || avatar.fallback || t('common.avatar')}
					key={index}
					className={cn('h-8 w-8 border border-background', index > 0 && '-ml-2', {
						'border-black/10 dark:border-white/20': !avatar.src,
					})}
				>
					{avatar.src && <AvatarImage source={{ uri: avatar.src, headers: requestHeaders }} />}
					<AvatarFallback className="bg-black/5 dark:bg-white/10">
						<Text className="font-medium text-foreground-muted text-[10px]">
							{avatar.fallback || '?'}
						</Text>
					</AvatarFallback>
				</Avatar>
			))}

			{overflowCount && overflowCount > 0 ? (
				<View className="-ml-2 h-8 w-8 items-center justify-center rounded-full border-2 border-background bg-muted">
					<Text className="font-medium text-foreground-muted text-[10px]">+{overflowCount}</Text>
				</View>
			) : null}
		</View>
	)
}
