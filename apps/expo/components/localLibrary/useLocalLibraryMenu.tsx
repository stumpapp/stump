import { Platform } from 'react-native'

import { useSelectionStore } from '~/stores/selection'

import { useEntityListHeader } from '../filter/EntityListHeader'
import { SelectionRightScreenHeader } from '../selection'
import { useLocalLibraryFilterMenu } from './LocalLibraryFilterMenu'
import { useLocalLibrarySortAndDisplayMenu } from './LocalLibrarySortAndDisplayMenu'

// TODO(expo-56): i cannot WAIT to delete this pattern and lean into the toolbar api exclusively

export function useLocalLibraryMenu() {
	const isSelecting = useSelectionStore((state) => state.isSelecting)

	const filterMenu = useLocalLibraryFilterMenu()
	const sortMenu = useLocalLibrarySortAndDisplayMenu()

	const toolbar = useEntityListHeader({
		filterMenu: isSelecting ? null : filterMenu,
		sortMenu: isSelecting
			? Platform.select({
					ios: null,
					android: <SelectionRightScreenHeader />,
				})
			: sortMenu,
	})

	return Platform.select({
		ios: isSelecting ? <SelectionRightScreenHeader /> : toolbar,
		android: toolbar,
	})
}
