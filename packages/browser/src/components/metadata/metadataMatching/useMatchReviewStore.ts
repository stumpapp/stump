import { MergeStrategy, MetadataField } from '@stump/graphql'
import { create } from 'zustand'

import { FieldOverride, MatchRecord } from './types'

export type MatchReviewState = {
	isOpen: boolean
	records: MatchRecord[]
	currentRecordIndex: number
	currentCandidateIndex: number
	excludedFields: Set<MetadataField>
	strategy: MergeStrategy
	fieldOverrides: Map<MetadataField, FieldOverride>
	lockedFields: Map<MetadataField, boolean>

	open: (records: MatchRecord[], startIndex?: number) => void
	close: () => void
	nextRecord: () => void
	prevRecord: () => void
	nextCandidate: () => void
	prevCandidate: () => void
	toggleField: (field: MetadataField) => void
	resetExcludedFields: () => void
	setStrategy: (strategy: MergeStrategy) => void
	setFieldOverride: (field: MetadataField, override: FieldOverride) => void
	clearFieldOverride: (field: MetadataField) => void
	clearAllOverrides: () => void
	toggleLockedField: (field: MetadataField) => void
	getLockedFields: () => Set<MetadataField>
}

export const useMatchReviewStore = create<MatchReviewState>((set, get) => ({
	isOpen: false,
	records: [],
	currentRecordIndex: 0,
	currentCandidateIndex: 0,
	excludedFields: new Set(),
	strategy: MergeStrategy.FillGaps,
	fieldOverrides: new Map(),
	lockedFields: new Map(),

	open: (records, startIndex = 0) =>
		set({
			isOpen: true,
			records,
			currentRecordIndex: Math.min(startIndex, records.length - 1),
			currentCandidateIndex: 0,
			excludedFields: new Set(),
			fieldOverrides: new Map(),
			lockedFields: new Map(),
		}),

	close: () =>
		set({
			isOpen: false,
			records: [],
			currentRecordIndex: 0,
			currentCandidateIndex: 0,
			excludedFields: new Set(),
			fieldOverrides: new Map(),
			lockedFields: new Map(),
		}),

	nextRecord: () => {
		const { currentRecordIndex, records } = get()
		if (currentRecordIndex < records.length - 1) {
			set({
				currentRecordIndex: currentRecordIndex + 1,
				currentCandidateIndex: 0,
				excludedFields: new Set(),
				fieldOverrides: new Map(),
				lockedFields: new Map(),
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
				lockedFields: new Map(),
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

	setFieldOverride: (field, override) =>
		set((state) => {
			const next = new Map(state.fieldOverrides)
			next.set(field, override)
			return { fieldOverrides: next }
		}),

	clearFieldOverride: (field) =>
		set((state) => {
			const next = new Map(state.fieldOverrides)
			next.delete(field)
			return { fieldOverrides: next }
		}),

	clearAllOverrides: () => set({ fieldOverrides: new Map() }),

	toggleLockedField: (field) =>
		set((state) => {
			const next = new Map(state.lockedFields)
			const record = state.records[state.currentRecordIndex]
			const serverLocked: MetadataField[] =
				(record?.mediaId
					? record?.media?.metadata?.lockedFields
					: record?.series?.metadata?.lockedFields) ?? []
			const isCurrentlyLocked = next.has(field) ? next.get(field)! : serverLocked.includes(field)
			next.set(field, !isCurrentlyLocked)
			return { lockedFields: next }
		}),

	getLockedFields: () => {
		const { records, currentRecordIndex, lockedFields } = get()
		const record = records[currentRecordIndex]
		const serverLocked: MetadataField[] =
			(record?.mediaId
				? record?.media?.metadata?.lockedFields
				: record?.series?.metadata?.lockedFields) ?? []
		const result = new Set<MetadataField>(serverLocked)
		for (const [field, locked] of lockedFields) {
			if (locked) {
				result.add(field)
			} else {
				result.delete(field)
			}
		}
		return result
	},
}))
