import { useRouter } from 'expo-router'
import { ComponentPropsWithoutRef } from 'react'
import { Pressable, View } from 'react-native'

import { cn } from '~/lib/utils'

import { useActiveServer } from '../activeServer'
import { Text } from '../ui'

type Props = {
	url: string
	label?: string
} & Omit<ComponentPropsWithoutRef<typeof Pressable>, 'children' | 'onPress'>

export default function FeedSelfURL({ label = 'View all', url }: Props) {
	const router = useRouter()
	const {
		activeServer: { id: serverID },
	} = useActiveServer()

	return (
		<Pressable
			onPress={() =>
				router.push({
					pathname: `/opds/${serverID}/feed`,
					params: { url },
				})
			}
		>
			{({ pressed }) => (
				<View
					className={cn('text-center', {
						'opacity-80': pressed,
					})}
				>
					<Text className="text-fill-info">{label}</Text>
				</View>
			)}
		</Pressable>
	)
}
