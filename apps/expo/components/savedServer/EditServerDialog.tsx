import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { BottomSheet } from '../ui'
import { View } from 'react-native'
import AddOrEditServerForm from './AddOrEditServerForm'
import { useColorScheme } from '~/lib/useColorScheme'
import { useSavedServers } from '~/stores'
import { useSharedValue } from 'react-native-reanimated'
import { BottomSheetModal } from '@gorhom/bottom-sheet'
import { SavedServerWithConfig } from '~/stores/savedServer'

type Props = {
	editingServer: SavedServerWithConfig | null
	onClose: () => void
}

export default function EditServerDialog({ editingServer, onClose }: Props) {
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

	console.log('editingServer', editingServer)

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
				<BottomSheet.ScrollView className="flex-1 gap-4 bg-background p-6">
					<AddOrEditServerForm editingServer={editingServer || undefined} onSubmit={() => {}} />
				</BottomSheet.ScrollView>
			</BottomSheet.Modal>
		</>
	)
}
