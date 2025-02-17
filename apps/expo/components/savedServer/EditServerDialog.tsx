import { BottomSheetModal } from '@gorhom/bottom-sheet'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import { View } from 'react-native'
import { useSharedValue } from 'react-native-reanimated'

import { useColorScheme } from '~/lib/useColorScheme'
import { CreateServer, SavedServerWithConfig } from '~/stores/savedServer'

import { BottomSheet, Heading, Text } from '../ui'
import AddOrEditServerForm from './AddOrEditServerForm'

type Props = {
	editingServer: SavedServerWithConfig | null
	onClose: () => void
	onSubmit: (server: CreateServer) => void
}

export default function EditServerDialog({ editingServer, onClose, onSubmit }: Props) {
	const ref = useRef<BottomSheetModal | null>(null)
	const snapPoints = useMemo(() => ['95%'], [])
	const animatedIndex = useSharedValue<number>(0)
	const animatedPosition = useSharedValue<number>(0)

	const { colorScheme } = useColorScheme()

	const isOpen = !!editingServer
	const handleChange = useCallback(
		(index: number) => {
			if (index === -1 && isOpen) {
				onClose()
			}
		},
		[isOpen, onClose],
	)

	useEffect(() => {
		if (editingServer) {
			ref.current?.present()
		} else {
			ref.current?.dismiss()
		}
	}, [editingServer])

	return (
		<>
			<BottomSheet.Modal
				ref={ref}
				index={snapPoints.length - 1}
				snapPoints={snapPoints}
				onChange={handleChange}
				open={isOpen}
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
				<BottomSheet.ScrollView className="flex-1 bg-background p-6">
					<View className="gap-4">
						<View>
							<Heading size="lg" className="font-bold leading-6">
								Edit server
							</Heading>
							<Text className="text-base text-foreground-muted">
								Make changes to the server configuration
							</Text>
						</View>

						<AddOrEditServerForm editingServer={editingServer || undefined} onSubmit={onSubmit} />
					</View>
				</BottomSheet.ScrollView>
			</BottomSheet.Modal>
		</>
	)
}
