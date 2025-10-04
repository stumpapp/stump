import { Api } from '@stump/sdk'
import clone from 'lodash/cloneDeep'
import { create } from 'zustand'

export type ICacheStore = {
	sdks: Record<string, Api>
	addSDK: (id: string, sdk: Api) => void
	removeSDK: (id: string) => void
}

const useCacheStore = create<ICacheStore>((set) => ({
	sdks: {},
	addSDK: (id, sdk) => set((state) => ({ sdks: { ...state.sdks, [id]: sdk } })),
	removeSDK: (id) =>
		set((state) => {
			const newSdks = clone(state.sdks)
			delete newSdks[id]
			return { sdks: newSdks }
		}),
}))

export { useCacheStore }
