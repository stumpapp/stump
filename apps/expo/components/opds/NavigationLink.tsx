import { OPDSNavigationLink } from '@stump/sdk'
import { useRouter } from 'expo-router'
import { ComponentPropsWithoutRef } from 'react'
import { Pressable, View } from 'react-native'

import { cn } from '~/lib/utils'

import { useActiveServer } from '../activeServer'
import { icons, Text } from '../ui'

const { ChevronRight } = icons

type Props = {
	link: OPDSNavigationLink
} & Omit<ComponentPropsWithoutRef<typeof Pressable>, 'children' | 'onPress'>

export default function NavigationLink({ link }: Props) {
	const router = useRouter()
	const {
		activeServer: { id: serverID },
	} = useActiveServer()

	return (
		<Pressable
			key={link.href}
			onPress={() =>
				router.push({
					pathname: '/opds/[id]/feed',
					params: { id: serverID, url: link.href },
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
	)
}
