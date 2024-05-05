import { LayoutMode, ReactTableColumnSort, ReactTableGlobalSort } from '@stump/types'
import { create } from 'zustand'
import { createJSONStorage, devtools, persist, StateStorage } from 'zustand/middleware'

type LayoutStore = {
	layout: LayoutMode
	setLayout: (layout: LayoutMode) => void

	sort?: ReactTableGlobalSort[]
	setSort: (sort: ReactTableGlobalSort[]) => void

	columns?: ReactTableColumnSort[]
	setColumns: (columns: ReactTableColumnSort[]) => void
}

type LayoutStoreParams = {
	key: string
	storage?: StateStorage
}

export const createLayoutStore = ({ key, storage }: LayoutStoreParams) =>
	create<LayoutStore>()(
		devtools(
			persist(
				(set) =>
					({
						layout: 'GRID',
						setColumns: (columns) => set({ columns }),
						setLayout: (layout) => set({ layout }),
						setSort: (sort) => set({ sort }),
					}) as LayoutStore,
				{
					name: `stump-${key}-layout-store`,
					storage: storage ? createJSONStorage(() => storage) : undefined,
					version: 1,
				},
			),
		),
	)
