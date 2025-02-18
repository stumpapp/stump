import { OPDSNavigationLink } from '@stump/sdk'
import { useRouter } from 'expo-router'
import { Pressable, View } from 'react-native'

import { icons } from '~/lib'
import { cn } from '~/lib/utils'

import { useActiveServer } from '../activeServer'
import { Text } from '../ui'
import { FeedComponentOptions } from './types'

const { Rss, Slash, ChevronRight } = icons

type Props = {
	navigation: OPDSNavigationLink[]
} & FeedComponentOptions

export default function Navigation({ navigation, renderEmpty }: Props) {
	const { activeServer } = useActiveServer()
	const router = useRouter()

	if (!navigation.length && !renderEmpty) return null

	return (
		<View>
			<Text size="xl" className="font-medium">
				Browse
			</Text>

			{navigation.map((link) => (
				<Pressable
					key={link.href}
					onPress={() =>
						router.push({
							pathname: '/opds/[id]/feed',
							params: {
								id: activeServer.id,
								url: link.href,
							},
						})
					}
				>
					{({ pressed }) => (
						<View
							className={cn('flex-row items-center justify-between py-2 tablet:py-3', {
								'opacity-70': pressed,
							})}
						>
							<Text size="lg">{link.title}</Text>
							<ChevronRight size={20} className="text-foreground-muted" />
						</View>
					)}
				</Pressable>
			))}

			{!navigation.length && (
				<View className="h-24 w-full items-center justify-center gap-2 rounded-lg border border-dashed border-edge p-3">
					<View className="relative flex justify-center">
						<View className="flex items-center justify-center rounded-lg bg-background-surface p-2">
							<Rss className="h-6 w-6 text-foreground-muted" />
							<Slash className="absolute h-6 w-6 scale-x-[-1] transform text-foreground opacity-80" />
						</View>
					</View>

					<Text>No navigation links in feed</Text>
				</View>
			)}
		</View>
	)
}
