import { OrderDirection } from '@stump/graphql'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

import { ZustandMMKVStorage } from './store'

/** a simple store for setting the order of events within a session detail */
type SessionDetailOrderStore = {
	order: OrderDirection
	setOrder: (order: OrderDirection) => void
}

export const useSessionDetailOrderStore = create(
	persist<SessionDetailOrderStore>(
		(set) => ({
			order: OrderDirection.Desc,
			setOrder: (order) => set({ order }),
		}),
		{
			name: 'session-detail-event-order',
			storage: createJSONStorage(() => ZustandMMKVStorage),
		},
	),
)

type ReadingTimelineDisplayStore = {
	order: OrderDirection
	groupBy: 'day' | 'month'
	patchStore: (data: Partial<ReadingTimelineDisplayStore>) => void
}

export const useReadingTimelineDisplayStore = create(
	persist<ReadingTimelineDisplayStore>(
		(set) => ({
			order: OrderDirection.Desc,
			groupBy: 'day',
			patchStore: (data) => set((state) => ({ ...state, ...data })),
		}),
		{
			name: 'reading-timeline-display',
			storage: createJSONStorage(() => ZustandMMKVStorage),
		},
	),
)
