import { useMemo } from 'react'
import { Linking, Pressable } from 'react-native'

import { Badge, Text } from '~/components/ui'
import { cn } from '~/lib/utils'

type Props = {
	href: string
}
export default function BookMetaLink({ href }: Props) {
	const url = useMemo(() => {
		try {
			return new URL(href)
		} catch {
			return null
		}
	}, [href])

	if (!url) {
		return null
	}

	return (
		<Pressable onPress={() => Linking.openURL(href)}>
			{({ pressed }) => (
				<Badge className={cn({ 'opacity-80': pressed })}>
					<Text className="">{url.hostname}</Text>
				</Badge>
			)}
		</Pressable>
	)
}
