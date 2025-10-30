import { OPDSNavigationLink } from '@stump/sdk'
import { useRouter } from 'expo-router'
import { ChevronRight, Rss, Slash } from 'lucide-react-native'
import { Fragment } from 'react'
import { Pressable, View } from 'react-native'

import { cn } from '~/lib/utils'

import { useActiveServer } from '../activeServer'
import { Text } from '../ui'
import { Icon } from '../ui/icon'
import { FeedComponentOptions } from './types'

type Props = {
	navigation: OPDSNavigationLink[]
} & FeedComponentOptions

export default function Navigation({ navigation, renderEmpty }: Props) {
	const { activeServer } = useActiveServer()
	const router = useRouter()

	if (!navigation.length && !renderEmpty) return null

	return (
		<View>
			<Text size="xl" className="font-medium leading-6 tracking-wide">
				Browse
			</Text>

			{navigation.map((link) => (
				<Fragment key={link.href}>
					<Pressable
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
								className={cn('flex-row items-center justify-between py-4', {
									'opacity-60': pressed,
								})}
							>
								<Text size="lg">{link.title}</Text>
								<Icon as={ChevronRight} className="h-6 w-6 text-foreground-muted opacity-70" />
							</View>
						)}
					</Pressable>

					<Divider />
				</Fragment>
			))}

			{!navigation.length && (
				<View className="squircle h-24 w-full items-center justify-center gap-2 rounded-lg border border-dashed border-edge p-3">
					<View className="relative flex justify-center">
						<View className="squircle flex items-center justify-center rounded-lg bg-background-surface p-2">
							<Icon as={Rss} className="h-6 w-6 text-foreground-muted" />
							<Icon
								as={Slash}
								className="absolute h-6 w-6 scale-x-[-1] transform text-foreground opacity-80"
							/>
						</View>
					</View>

					<Text>No navigation links in feed</Text>
				</View>
			)}
		</View>
	)
}

const Divider = () => <View className="h-px w-full bg-edge" />
