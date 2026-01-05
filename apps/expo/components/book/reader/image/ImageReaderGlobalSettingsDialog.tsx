import { Host, Picker } from '@expo/ui/swift-ui'
import { TrueSheet } from '@lodev09/react-native-true-sheet'
import { useEffect, useRef, useState } from 'react'
import { Platform, ScrollView, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { Heading, Tabs, Text } from '~/components/ui'
import { IS_IOS_24_PLUS, useColors } from '~/lib/constants'
import { useColorScheme } from '~/lib/useColorScheme'

import { ReaderSettings } from '../settings'
import { useImageBasedReader } from './context'

type Props = {
	isOpen: boolean
	onClose: () => void
}

export default function ImageReaderGlobalSettingsDialog({ isOpen, onClose }: Props) {
	const {
		book: { id: bookID },
		serverId,
	} = useImageBasedReader()

	const ref = useRef<TrueSheet | null>(null)

	const { colorScheme } = useColorScheme()

	const [modality, setModality] = useState<'book' | 'global'>('book')

	useEffect(() => {
		if (isOpen) {
			ref.current?.present()
		} else {
			ref.current?.dismiss()
			setModality('book')
		}
	}, [isOpen])

	const renderHelpText = () => {
		if (modality === 'book') {
			return 'These settings only apply to this book, overriding any global settings'
		} else {
			return 'These settings apply to all books'
		}
	}

	const insets = useSafeAreaInsets()
	const colors = useColors()

	return (
		<TrueSheet
			ref={ref}
			detents={[0.5, 1]}
			cornerRadius={24}
			grabber
			scrollable
			backgroundColor={IS_IOS_24_PLUS ? undefined : colors.background.DEFAULT}
			grabberOptions={{
				color: colorScheme === 'dark' ? '#333' : '#ccc',
			}}
			onDidDismiss={onClose}
			insetAdjustment="automatic"
		>
			<ScrollView
				className="flex-1 p-6"
				contentContainerStyle={{ alignItems: 'flex-start' }}
				nestedScrollEnabled
			>
				<View
					className="w-full flex-1 gap-8"
					style={{
						paddingBottom: insets.bottom,
					}}
				>
					<View className="gap-1">
						<View className="flex flex-row items-center justify-between">
							<Heading size="lg">Settings</Heading>

							{Platform.select({
								ios: (
									<Host matchContents style={{ width: 120 }}>
										<Picker
											options={['Book', 'Global']}
											selectedIndex={modality === 'book' ? 0 : 1}
											onOptionSelected={({ nativeEvent: { index } }) => {
												if (index === 0) {
													setModality('book')
												} else {
													setModality('global')
												}
											}}
											variant="segmented"
										/>
									</Host>
								),
								android: (
									<Tabs
										value={modality}
										onValueChange={(value) => setModality(value as 'book' | 'global')}
									>
										<Tabs.List className="flex-row">
											<Tabs.Trigger value="book">
												<Text>Book</Text>
											</Tabs.Trigger>

											<Tabs.Trigger value="global">
												<Text>Global</Text>
											</Tabs.Trigger>
										</Tabs.List>
									</Tabs>
								),
							})}
						</View>

						<Text className="text-foreground-muted">{renderHelpText()}</Text>
					</View>

					<ReaderSettings
						{...(modality === 'book'
							? {
									forBook: bookID,
									forServer: serverId,
								}
							: {})}
					/>
				</View>
			</ScrollView>
		</TrueSheet>
	)
}
