import { InterfaceLayout } from '@stump/graphql'
import { ColumnOrder, ColumnSort } from '@stump/sdk'
import { create } from 'zustand'
import { createJSONStorage, devtools, persist, StateStorage } from 'zustand/middleware'

type LayoutStore = {
	layout: InterfaceLayout
	setLayout: (layout: InterfaceLayout) => void

	sort?: ColumnOrder[]
	setSort: (sort: ColumnOrder[]) => void

	columns?: ColumnSort[]
	setColumns: (columns: ColumnSort[]) => void
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
						layout: InterfaceLayout.Grid,
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

type FooterOffsetStore = {
	footerOffset: number
	setFooterOffset: (offset: number) => void
}

export const useFooterOffsetStore = create<FooterOffsetStore>()((set) => ({
	footerOffset: 0,
	setFooterOffset: (offset: number) => set({ footerOffset: offset }),
}))
