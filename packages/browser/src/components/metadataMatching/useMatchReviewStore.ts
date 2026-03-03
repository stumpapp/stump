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
	fieldOverrides: Map<MetadataField, unknown>

	open: (records: MatchRecord[], startIndex?: number) => void
	close: () => void
	nextRecord: () => void
	prevRecord: () => void
	nextCandidate: () => void
	prevCandidate: () => void
	toggleField: (field: MetadataField) => void
	resetExcludedFields: () => void
	setStrategy: (strategy: MergeStrategy) => void
	setFieldOverride: (field: MetadataField, value: unknown) => void
	clearFieldOverride: (field: MetadataField) => void
	clearAllOverrides: () => void
}

export const useMatchReviewStore = create<MatchReviewState>((set, get) => ({
	isOpen: false,
	records: [],
	currentRecordIndex: 0,
	currentCandidateIndex: 0,
	excludedFields: new Set(),
	strategy: MergeStrategy.FillGaps,
	fieldOverrides: new Map(),

	open: (records, startIndex = 0) =>
		set({
			isOpen: true,
			records,
			currentRecordIndex: Math.min(startIndex, records.length - 1),
			currentCandidateIndex: 0,
			excludedFields: new Set(),
			fieldOverrides: new Map(),
		}),

	close: () =>
		set({
			isOpen: false,
			records: [],
			currentRecordIndex: 0,
			currentCandidateIndex: 0,
			excludedFields: new Set(),
			fieldOverrides: new Map(),
		}),

	nextRecord: () => {
		const { currentRecordIndex, records } = get()
		if (currentRecordIndex < records.length - 1) {
			set({
				currentRecordIndex: currentRecordIndex + 1,
				currentCandidateIndex: 0,
				excludedFields: new Set(),
				fieldOverrides: new Map(),
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
				fieldOverrides: new Map(),
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

	setFieldOverride: (field, value) =>
		set((state) => {
			const next = new Map(state.fieldOverrides)
			next.set(field, value)
			return { fieldOverrides: next }
		}),

	clearFieldOverride: (field) =>
		set((state) => {
			const next = new Map(state.fieldOverrides)
			next.delete(field)
			return { fieldOverrides: next }
		}),

	clearAllOverrides: () => set({ fieldOverrides: new Map() }),
}))
