import { useNavigation } from 'expo-router'
import { useLayoutEffect } from 'react'
import { Platform } from 'react-native'

import { useSelectionStore } from '~/stores/selection'

import { SelectionRightScreenHeader } from '../selection'
import DownloadsHeaderMenu from './DownloadsHeaderMenu'

export function useLocalLibraryMenu() {
	const isSelecting = useSelectionStore((state) => state.isSelecting)

	const navigation = useNavigation()
	useLayoutEffect(() => {
		if (Platform.OS !== 'android') return
		navigation.setOptions({
			headerRight: () => (isSelecting ? <SelectionRightScreenHeader /> : <DownloadsHeaderMenu />),
		})
	}, [navigation, isSelecting])

	if (Platform.OS === 'android') return null

	if (isSelecting) return <SelectionRightScreenHeader />

	return <DownloadsHeaderMenu />
}
