import { create } from 'zustand'

import { PendingTagSuggestion } from './types'

export type TagReviewState = {
	isOpen: boolean
	records: PendingTagSuggestion[]
	currentRecordIndex: number
	/**
	 * The tag names currently selected for the record under review. Defaults
	 * to every suggested tag when a record is opened.
	 */
	selectedTags: Set<string>

	open: (records: PendingTagSuggestion[], startIndex?: number) => void
	close: () => void
	nextRecord: () => void
	prevRecord: () => void
	toggleTag: (name: string) => void
	selectAllTags: () => void
	clearSelectedTags: () => void
}

const defaultSelection = (record?: PendingTagSuggestion) =>
	new Set(record?.suggestedTags.map((tag) => tag.name) ?? [])

export const useLlmTagReviewStore = create<TagReviewState>((set, get) => ({
	isOpen: false,
	records: [],
	currentRecordIndex: 0,
	selectedTags: new Set(),

	open: (records, startIndex = 0) => {
		const index = Math.max(0, Math.min(startIndex, records.length - 1))
		set({
			isOpen: true,
			records,
			currentRecordIndex: index,
			selectedTags: defaultSelection(records[index]),
		})
	},

	close: () =>
		set({
			isOpen: false,
			records: [],
			currentRecordIndex: 0,
			selectedTags: new Set(),
		}),

	nextRecord: () => {
		const { currentRecordIndex, records } = get()
		if (currentRecordIndex < records.length - 1) {
			const nextIndex = currentRecordIndex + 1
			set({
				currentRecordIndex: nextIndex,
				selectedTags: defaultSelection(records[nextIndex]),
			})
		}
	},

	prevRecord: () => {
		const { currentRecordIndex, records } = get()
		if (currentRecordIndex > 0) {
			const prevIndex = currentRecordIndex - 1
			set({
				currentRecordIndex: prevIndex,
				selectedTags: defaultSelection(records[prevIndex]),
			})
		}
	},

	toggleTag: (name) =>
		set((state) => {
			const next = new Set(state.selectedTags)
			if (next.has(name)) {
				next.delete(name)
			} else {
				next.add(name)
			}
			return { selectedTags: next }
		}),

	selectAllTags: () =>
		set((state) => ({
			selectedTags: defaultSelection(state.records[state.currentRecordIndex]),
		})),

	clearSelectedTags: () => set({ selectedTags: new Set() }),
}))
