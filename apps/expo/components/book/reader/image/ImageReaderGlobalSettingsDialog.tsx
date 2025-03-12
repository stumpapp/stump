import { BottomSheetModal } from '@gorhom/bottom-sheet'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { View } from 'react-native'
import { useSharedValue } from 'react-native-reanimated'

import { useActiveServer } from '~/components/activeServer'
import { Heading, Tabs, Text } from '~/components/ui'
import { BottomSheet } from '~/components/ui/bottom-sheet'
import { useColorScheme } from '~/lib/useColorScheme'

import { ReaderSettings } from '../settings'
import { useImageBasedReader } from './context'

type Props = {
	isOpen: boolean
	onClose: () => void
}

export default function ImageReaderGlobalSettingsDialog({ isOpen, onClose }: Props) {
	const {
		activeServer: { id: serverID },
	} = useActiveServer()
	const {
		book: { id: bookID },
	} = useImageBasedReader()

	const ref = useRef<BottomSheetModal | null>(null)
	const snapPoints = useMemo(() => ['95%'], [])
	const animatedIndex = useSharedValue<number>(0)
	const animatedPosition = useSharedValue<number>(0)

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

	const handleChange = useCallback(
		(index: number) => {
			if (index === -1 && isOpen) {
				onClose()
			}
		},
		[isOpen, onClose],
	)

	const renderHelpText = () => {
		if (modality === 'book') {
			return 'These settings only apply to this book, overriding any global settings'
		} else {
			return 'These settings apply to all books'
		}
	}

	return (
		<View className="fixed inset-0 z-30 flex-1">
			<BottomSheet.Modal
				ref={ref}
				index={snapPoints.length - 1}
				snapPoints={snapPoints}
				onChange={handleChange}
				backgroundComponent={(props) => <View {...props} className="rounded-t-xl bg-background" />}
				handleIndicatorStyle={{ backgroundColor: colorScheme === 'dark' ? '#333' : '#ccc' }}
				handleComponent={(props) => (
					<BottomSheet.Handle
						{...props}
						className="mt-2"
						animatedIndex={animatedIndex}
						animatedPosition={animatedPosition}
					/>
				)}
			>
				<BottomSheet.View className="flex-1 items-start bg-background p-6">
					<View className="w-full flex-1 gap-8">
						<View className="gap-1">
							<View className="flex flex-row items-center justify-between">
								<Heading size="lg">Settings</Heading>

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
							</View>

							<Text className="text-foreground-muted">{renderHelpText()}</Text>
						</View>

						<ReaderSettings
							{...(modality === 'book'
								? {
										forBook: bookID,
										forServer: serverID,
									}
								: {})}
						/>
					</View>
				</BottomSheet.View>
			</BottomSheet.Modal>
		</View>
	)
}
