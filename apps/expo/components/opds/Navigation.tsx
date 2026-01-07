import { useSDK } from '@stump/client'
import { OPDSNavigationLink, resolveUrl } from '@stump/sdk'
import { useRouter } from 'expo-router'
import { ChevronRight, Rss } from 'lucide-react-native'
import { Fragment } from 'react'
import { Pressable, View } from 'react-native'

import { cn } from '~/lib/utils'

import { useActiveServer } from '../activeServer'
import { ListEmptyMessage, Text } from '../ui'
import { Icon } from '../ui/icon'
import { LinkDivider } from './LinkDivider'
import { FeedComponentOptions } from './types'

type Props = {
	navigation: OPDSNavigationLink[]
} & FeedComponentOptions

export default function Navigation({ navigation, renderEmpty }: Props) {
	const { sdk } = useSDK()
	const { activeServer } = useActiveServer()
	const router = useRouter()

	if (!navigation.length && !renderEmpty) return null

	return (
		<View>
			<Text size="xl" className="px-4 font-medium leading-6 tracking-wide">
				Browse
			</Text>

			{navigation.map((link) => (
				<Fragment key={link.href}>
					<Pressable
						onPress={() =>
							router.push({
								pathname: '/opds/[id]/feed/[url]',
								params: {
									id: activeServer.id,
									url: resolveUrl(link.href, sdk.rootURL),
								},
							})
						}
					>
						{({ pressed }) => (
							<View
								className={cn('flex-row items-center justify-between p-4', {
									'opacity-60': pressed,
								})}
							>
								<Text size="lg">{link.title}</Text>
								<Icon as={ChevronRight} className="h-6 w-6 text-foreground-muted opacity-70" />
							</View>
						)}
					</Pressable>

					<LinkDivider />
				</Fragment>
			))}

			{!navigation.length && <ListEmptyMessage icon={Rss} message="No navigation links in feed" />}
		</View>
	)
}
