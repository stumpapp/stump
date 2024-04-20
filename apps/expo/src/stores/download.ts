import AsyncStorage from '@react-native-async-storage/async-storage'
import { Library, Series } from '@stump/types'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

type DownloadedFile = {
	mediaId: string
	path: string
	metadata: {
		library: Partial<Library>
		series: Partial<Series>
	}
}

type DownloadStore = {
	files: DownloadedFile[]
}

export const useDownloadStore = create<DownloadStore>()(
	persist(
		() => ({
			files: [],
		}),
		{
			name: 'stump-mobile-downloads-store',
			storage: createJSONStorage(() => AsyncStorage),
		},
	),
)
