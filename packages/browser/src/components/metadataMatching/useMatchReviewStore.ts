import { MergeStrategy, MetadataField } from '@stump/graphql'
import { create } from 'zustand'

import { MatchRecord } from './types'

export type MatchReviewState = {
	isOpen: boolean
	records: MatchRecord[]
	currentRecordIndex: number
	currentCandidateIndex: number
	excludedFields: Set<MetadataField>
	strategy: MergeStrategy

	open: (records: MatchRecord[], startIndex?: number) => void
	close: () => void
	nextRecord: () => void
	prevRecord: () => void
	nextCandidate: () => void
	prevCandidate: () => void
	toggleField: (field: MetadataField) => void
	resetExcludedFields: () => void
	setStrategy: (strategy: MergeStrategy) => void
}

export const useMatchReviewStore = create<MatchReviewState>((set, get) => ({
	isOpen: false,
	records: [],
	currentRecordIndex: 0,
	currentCandidateIndex: 0,
	excludedFields: new Set(),
	strategy: MergeStrategy.FillGaps,

	open: (records, startIndex = 0) =>
		set({
			isOpen: true,
			records,
			currentRecordIndex: Math.min(startIndex, records.length - 1),
			currentCandidateIndex: 0,
			excludedFields: new Set(),
		}),

	close: () =>
		set({
			isOpen: false,
			records: [],
			currentRecordIndex: 0,
			currentCandidateIndex: 0,
			excludedFields: new Set(),
		}),

	nextRecord: () => {
		const { currentRecordIndex, records } = get()
		if (currentRecordIndex < records.length - 1) {
			set({
				currentRecordIndex: currentRecordIndex + 1,
				currentCandidateIndex: 0,
				excludedFields: new Set(),
			})
		}
	},

	prevRecord: () => {
		const { currentRecordIndex } = get()
		if (currentRecordIndex > 0) {
			set({
				currentRecordIndex: currentRecordIndex - 1,
				currentCandidateIndex: 0,
				excludedFields: new Set(),
			})
		}
	},

	nextCandidate: () => {
		const { currentCandidateIndex, records, currentRecordIndex } = get()
		const record = records[currentRecordIndex]
		const candidates = record?.matchCandidates ?? []
		if (currentCandidateIndex < candidates.length - 1) {
			set({ currentCandidateIndex: currentCandidateIndex + 1 })
		}
	},

	prevCandidate: () => {
		const { currentCandidateIndex } = get()
		if (currentCandidateIndex > 0) {
			set({ currentCandidateIndex: currentCandidateIndex - 1 })
		}
	},

	toggleField: (field) =>
		set((state) => {
			const next = new Set(state.excludedFields)
			if (next.has(field)) {
				next.delete(field)
			} else {
				next.add(field)
			}
			return { excludedFields: next }
		}),

	resetExcludedFields: () => set({ excludedFields: new Set() }),

	setStrategy: (strategy) => set({ strategy }),
}))
