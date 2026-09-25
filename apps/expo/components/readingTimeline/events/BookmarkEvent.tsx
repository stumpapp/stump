import { Bookmark } from 'lucide-react-native'
import { View } from 'react-native'

import { Icon, Text } from '~/components/ui'

import { fakeData } from '../fakeData'

type Props = {
	event: Extract<
		(typeof fakeData.readthroughs)[number]['sessions'][number]['events'][number],
		{ __typename: 'Bookmark' }
	>
}

// TODO: prolly sm less boring than "{action verb} {location}" ?
export function BookmarkEvent({ event }: Props) {
	return (
		<View className="gap-6 flex flex-row items-center">
			<View className="squircle h-12 w-12 bg-black/5 dark:bg-white/10 flex shrink-0 items-center justify-center rounded-2xl">
				{/*<LinearGradient
			{...gradient}
			useAngle
			angle={195}
			style={{ position: 'absolute', inset: 0 }}
		/>*/}
				<Icon as={Bookmark} size={18} strokeWidth={1.8} absoluteStrokeWidth />
				<View className="inset-0 dark:border-white/10 border-white/30 squircle absolute rounded-xl border-[0.75px]" />
			</View>

			<Text>Bookmarked page {event.page}</Text>
		</View>
	)
}
