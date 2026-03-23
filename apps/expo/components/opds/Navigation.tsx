import { useSDK } from '@stump/client'
import { OPDSNavigationLink, resolveUrl } from '@stump/sdk'
import { useRouter } from 'expo-router'
import { ChevronRight, Rss } from 'lucide-react-native'
import { Pressable, View } from 'react-native'

import { useActiveServer } from '../activeServer'
import { Card, ListEmptyMessage } from '../ui'
import { Icon } from '../ui/icon'
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
		<View className="px-4">
			<Card label="Browse">
				{navigation.map((link) => (
					<Pressable
						key={link.href}
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
							<Card.Row label={link.title} style={pressed && { opacity: 0.6 }}>
								<Icon as={ChevronRight} className="h-5 w-5 shrink-0 text-foreground-muted" />
							</Card.Row>
						)}
					</Pressable>
				))}
			</Card>

			{!navigation.length && <ListEmptyMessage icon={Rss} message="No navigation links in feed" />}
		</View>
	)
}
