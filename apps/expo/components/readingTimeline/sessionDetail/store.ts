import { OrderDirection } from '@stump/graphql'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

import { ZustandMMKVStorage } from '~/stores/store'

/** a simple store for setting the order of events within a session detail */
type EventOrderStore = {
	order: OrderDirection
	setOrder: (order: OrderDirection) => void
}

export const useEventOrderStore = create(
	persist<EventOrderStore>(
		(set) => ({
			order: OrderDirection.Desc,
			setOrder: (order) => set({ order }),
		}),
		{
			name: 'event-order',
			storage: createJSONStorage(() => ZustandMMKVStorage),
		},
	),
)
