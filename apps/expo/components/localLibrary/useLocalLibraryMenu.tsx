import { useSelectionStore } from '~/stores/selection'

import { useEntityListHeader } from '../filter/EntityListHeader'
import { SelectionRightScreenHeader } from '../selection'
import { useLocalLibraryFilterMenu } from './LocalLibraryFilterMenu'
import { useLocalLibrarySortAndDisplayMenu } from './LocalLibrarySortAndDisplayMenu'

export function useLocalLibraryMenu() {
	const isSelecting = useSelectionStore((state) => state.isSelecting)

	const filterMenu = useLocalLibraryFilterMenu()
	const sortMenu = useLocalLibrarySortAndDisplayMenu()

	const toolbar = useEntityListHeader({
		filterMenu: isSelecting ? null : filterMenu,
		sortMenu: isSelecting ? null : sortMenu,
	})

	return isSelecting ? <SelectionRightScreenHeader /> : toolbar
}
