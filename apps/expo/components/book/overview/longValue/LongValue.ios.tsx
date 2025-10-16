import { BottomSheet, Host } from '@expo/ui/swift-ui'
import { Fragment, useState } from 'react'
import { Pressable, useWindowDimensions, View } from 'react-native'

import { Text } from '~/components/ui'

import { LongValueProps } from './types'

// TODO: Don't intake stripped HTML, strip for preview and render markdown in sheet
export default function LongValue({ label, value }: LongValueProps) {
	const { width } = useWindowDimensions()

	const [isOpened, setIsOpened] = useState(false)

	return (
		<Fragment>
			<Pressable style={{ flex: 1 }} onPress={() => setIsOpened(true)}>
				<View className="flex flex-row items-start justify-between bg-background p-3">
					<Text className="shrink-0 text-foreground-muted">{label}</Text>
					<View className="max-w-[75%]">
						<Text className="text-right" numberOfLines={4} ellipsizeMode="tail">
							{value}
						</Text>
					</View>
				</View>
			</Pressable>

			{/* Note: I had to add this conditional bc the Host seems to mess with the Pressable */}
			{isOpened && (
				<Host style={{ position: 'absolute', width }}>
					<BottomSheet isOpened={isOpened} onIsOpenedChange={(e) => setIsOpened(e)}>
						<Text className="p-6 text-foreground">{value}</Text>
					</BottomSheet>
				</Host>
			)}
		</Fragment>
	)
}
