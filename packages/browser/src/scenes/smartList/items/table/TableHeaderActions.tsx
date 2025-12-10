import { useLocaleContext } from '@stump/i18n'
import { useCallback } from 'react'

import { Search } from '@/components/filters'

import { useSafeWorkingView } from '../../context'
import { useSmartListViewStore } from '../../store'
import FilterBottomDrawer from './FilterBottomDrawer'
import SavedViewSelector from './SavedViewSelector'
import TableColumnsBottomDrawer from './TableColumnsBottomDrawer'
import ViewManagerDropdown from './ViewManagerDropdown'

export default function TableHeaderActions() {
	const { t } = useLocaleContext()
	const {
		workingView: { search },
		updateWorkingView,
	} = useSafeWorkingView()

	const selectedView = useSmartListViewStore((state) => state.selectedView)

	const setFilter = useCallback(
		(value?: string) => updateWorkingView({ search: value || undefined }),
		[updateWorkingView],
	)

	return (
		<header className="-mt-2 mb-2 flex w-full items-center gap-x-2 bg-background px-4">
			<SavedViewSelector />
			<FilterBottomDrawer />
			<TableColumnsBottomDrawer />
			<Search
				key={selectedView?.id ?? 'default'}
				initialValue={search ?? undefined}
				onChange={(value) => setFilter(value)}
				placeholder={t('userSmartListScene.itemsScene.actionHeader.search.placeholder')}
			/>
			<ViewManagerDropdown />
		</header>
	)
}
