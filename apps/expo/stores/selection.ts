import { createContext, useContext } from 'react'
import { create, useStore } from 'zustand'

export type ISelectionStore = {
	isSelecting: boolean
	setIsSelecting: (selecting: boolean) => void
	selectionState: Set<string>
	toggleSelection: (id: string) => void
	setSelection: (ids: string[]) => void
	clearSelection: () => void
	resetSelection: () => void
	isSelected: (id: string) => boolean

	selectAll: () => void
	isSelectAll: () => boolean

	itemIdents: string[]
	setItemIdents: (idents: string[]) => void

	customActions: Record<string, (ids: string[]) => Promise<void>>
	registerCustomActions: (actions: Record<string, (ids: string[]) => Promise<void>>) => void
}

export const createSelectionStore = () =>
	create<ISelectionStore>((set, get) => ({
		itemIdents: [],
		setItemIdents: (idents: string[]) => set({ itemIdents: idents }),
		isSelecting: false,
		setIsSelecting: (selecting: boolean) => set({ isSelecting: selecting }),
		selectionState: new Set<string>(),
		selectAll: () => {
			const allIds = get().itemIdents
			set(() => ({
				selectionState: new Set(allIds),
			}))
		},
		isSelectAll: () => {
			// Note: If > technically a bug, but shouldn't happen in practice
			return get().selectionState.size >= get().itemIdents.length
		},
		toggleSelection: (id: string) =>
			set((state) => {
				const newSelection = new Set(state.selectionState)
				if (newSelection.has(id)) {
					newSelection.delete(id)
				} else {
					newSelection.add(id)
				}
				return { selectionState: newSelection }
			}),
		setSelection: (ids: string[]) =>
			set(() => ({
				selectionState: new Set(ids),
			})),
		clearSelection: () =>
			set(() => ({
				selectionState: new Set<string>(),
			})),
		isSelected: (id: string) => get().selectionState.has(id),
		resetSelection: () =>
			set(() => ({
				selectionState: new Set<string>(),
				isSelecting: false,
			})),
		customActions: {},
		registerCustomActions: (actions: Record<string, (ids: string[]) => Promise<void>>) =>
			set(() => ({
				customActions: actions,
			})),
	}))

export type SelectionStore = ReturnType<typeof createSelectionStore>

export const SelectionContext = createContext<SelectionStore | null>(null)

export const useSelectionStore = <T>(selector: (state: ISelectionStore) => T): T => {
	const store = useContext(SelectionContext)
	if (!store) throw new Error('useSelectionStore must be used within a SelectionProvider')
	return useStore(store, selector)
}
