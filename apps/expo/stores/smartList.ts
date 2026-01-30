import { create } from 'zustand'

type SmartListGroupStore = {
	collapsedGroupsByList: Map<string, Set<string>> // [listId, Set<groupName>]
	toggleGroup: (listId: string, groupName: string) => void
	isCollapsed: (listId: string, groupName: string) => boolean
	collapseAll: (listId: string, groupNames: string[]) => void
	clearList: (listId: string) => void
	isAllExpanded: (listId: string) => boolean
	reset: () => void
}

export const useSmartListGroupStore = create<SmartListGroupStore>((set, get) => ({
	collapsedGroupsByList: new Map(),

	toggleGroup: (listId, groupName) =>
		set((state) => {
			const newMap = new Map(state.collapsedGroupsByList)
			const listGroups = new Set(newMap.get(listId) ?? [])

			if (listGroups.has(groupName)) {
				listGroups.delete(groupName)
			} else {
				listGroups.add(groupName)
			}

			newMap.set(listId, listGroups)
			return { collapsedGroupsByList: newMap }
		}),

	isCollapsed: (listId, groupName) =>
		get().collapsedGroupsByList.get(listId)?.has(groupName) ?? false,

	collapseAll: (listId, groupNames) =>
		set((state) => {
			const newMap = new Map(state.collapsedGroupsByList)
			newMap.set(listId, new Set(groupNames))
			return { collapsedGroupsByList: newMap }
		}),

	clearList: (listId) =>
		set((state) => {
			const newMap = new Map(state.collapsedGroupsByList)
			newMap.delete(listId)
			return { collapsedGroupsByList: newMap }
		}),

	isAllExpanded: (listId) => {
		const collapsedGroups = get().collapsedGroupsByList.get(listId)
		return !collapsedGroups || collapsedGroups.size === 0
	},

	reset: () => set({ collapsedGroupsByList: new Map() }),
}))
