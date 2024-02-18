import { ChevronRight } from 'lucide-react-native'
import { useColorScheme } from 'nativewind'
import React from 'react'

import { Link, Text, View } from '@/components'
import { gray } from '@/constants/colors'

// TODO: Icon
type Props = {
	title: string
	to: string
}
export default function SettingsListItem({ title, to }: Props) {
	const { colorScheme } = useColorScheme()

	return (
		<Link to={{ screen: to }} className="w-full">
			<View className="flex w-full flex-row items-center justify-between p-2">
				<Text>{title}</Text>
				<ChevronRight
					className="h-4 w-4 opacity-70"
					color={colorScheme === 'dark' ? gray[200] : gray[800]}
				/>
			</View>
		</Link>
	)
}
