import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { BottomSheet, Text } from '../ui'
import { View } from 'react-native'
import AddOrEditServerForm from './AddOrEditServerForm'
import { useColorScheme } from '~/lib/useColorScheme'
import { useSavedServers } from '~/stores'
import { useSharedValue } from 'react-native-reanimated'
import { BottomSheetModal } from '@gorhom/bottom-sheet'
import { CreateServer, SavedServerWithConfig } from '~/stores/savedServer'

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

	const {} = useSavedServers()

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
							<Text className="text-2xl font-bold leading-6">Edit server</Text>
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
