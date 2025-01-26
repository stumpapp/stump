import AsyncStorage from '@react-native-async-storage/async-storage'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

type DownloadedFile = {
	path: string
	serverID: string
	// meta: {
	// 	library: Partial<Library>
	// 	series: Partial<Series>
	// }
}

type DownloadStore = {
	files: DownloadedFile[]
}

export const useDownloadStore = create<DownloadStore>()(
	persist(
		() => ({
			files: [] as DownloadedFile[],
		}),
		{
			name: 'stump-mobile-downloads-store',
			storage: createJSONStorage(() => AsyncStorage),
		},
	),
)
