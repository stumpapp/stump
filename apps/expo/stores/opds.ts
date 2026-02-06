import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

import { ZustandMMKVStorage } from './store'

export type OPDSFeedLayout = 'grid' | 'list'

type IOPDSPreferenceStore = {
	layout: OPDSFeedLayout
	setLayout: (layout: OPDSFeedLayout) => void
}

export const useOPDSPreferencesStore = create<IOPDSPreferenceStore>()(
	persist(
		(set) => ({
			layout: 'grid',
			setLayout: (layout: OPDSFeedLayout) => set({ layout }),
		}),
		{
			name: 'opds-preferences-store',
			version: 1,
			storage: createJSONStorage(() => ZustandMMKVStorage),
		},
	),
)
